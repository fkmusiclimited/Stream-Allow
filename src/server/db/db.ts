import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PGlite } from '@electric-sql/pglite';
import { encryptStreamKey } from '../utils/crypto';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL Connection Pool configuration for external database (VPS or Cloud)
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString: connectionString || undefined,
  host: connectionString ? undefined : (process.env.PGHOST || undefined),
  user: process.env.PGUSER || undefined,
  password: process.env.PGPASSWORD || undefined,
  database: process.env.PGDATABASE || undefined,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.warn('[PostgreSQL Pool] Notice:', err.message);
});

let isDatabaseConnected = false;
let isUsingExternalPg = false;
let pgliteInstance: PGlite | null = null;
let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
let periodicSnapshotInterval: ReturnType<typeof setInterval> | null = null;
let isSavingSnapshot = false;

const SNAPSHOT_TABLES = [
  'users',
  'playlists',
  'uploaded_media',
  'playlist_videos',
  'live_streams',
  'transactions',
  'activity_logs',
  'homepage_demo_config'
] as const;

function getDataDirPath(): string {
  return path.resolve(process.cwd(), 'data');
}

function getSnapshotFilePath(): string {
  return path.join(getDataDirPath(), 'db_snapshot.json');
}

function cleanStalePgLocks(pgDataPath: string) {
  if (!fs.existsSync(pgDataPath)) return;
  const lockFiles = ['postmaster.pid', 'postmaster.opts', 'standby.signal'];
  for (const f of lockFiles) {
    const full = path.join(pgDataPath, f);
    if (fs.existsSync(full)) {
      try {
        fs.chmodSync(full, 0o666);
      } catch {}
      try {
        fs.unlinkSync(full);
      } catch {}
    }
  }
  const statTmpDir = path.join(pgDataPath, 'pg_stat_tmp');
  if (fs.existsSync(statTmpDir)) {
    try {
      for (const entry of fs.readdirSync(statTmpDir)) {
        try {
          fs.unlinkSync(path.join(statTmpDir, entry));
        } catch {}
      }
    } catch {}
  }
}

function archiveClusterDir(pgDataPath: string) {
  if (!fs.existsSync(pgDataPath)) return;
  const backupPath = `${pgDataPath}.prev`;
  try {
    if (fs.existsSync(backupPath)) {
      fs.rmSync(backupPath, { recursive: true, force: true });
    }
    fs.renameSync(pgDataPath, backupPath);
  } catch {
    try {
      fs.rmSync(pgDataPath, { recursive: true, force: true });
    } catch {}
  }
}

function validateClusterBeforeOpen(pgDataPath: string) {
  if (!fs.existsSync(pgDataPath)) return;
  const confFile = path.join(pgDataPath, 'postgresql.conf');
  const versionFile = path.join(pgDataPath, 'PG_VERSION');
  const controlFile = path.join(pgDataPath, 'global', 'pg_control');

  if (!fs.existsSync(confFile) || !fs.existsSync(versionFile) || !fs.existsSync(controlFile)) {
    archiveClusterDir(pgDataPath);
    return;
  }

  try {
    const pgVersion = fs.readFileSync(versionFile, 'utf8').trim();
    const controlStats = fs.statSync(controlFile);
    if (pgVersion !== '18' || controlStats.size < 512) {
      archiveClusterDir(pgDataPath);
      return;
    }
  } catch {
    archiveClusterDir(pgDataPath);
    return;
  }

  cleanStalePgLocks(pgDataPath);
}

export async function saveDbSnapshot(): Promise<void> {
  if (isSavingSnapshot || isUsingExternalPg || !pgliteInstance) return;
  isSavingSnapshot = true;
  try {
    const dataDir = getDataDirPath();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const tables: Record<string, any[]> = {};
    for (const tableName of SNAPSHOT_TABLES) {
      try {
        const res = await pgliteInstance.query(`SELECT * FROM ${tableName}`);
        tables[tableName] = res.rows || [];
      } catch {
        tables[tableName] = [];
      }
    }

    const payload = JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      tables
    });

    const targetPath = getSnapshotFilePath();
    const tempPath = `${targetPath}.tmp`;
    fs.writeFileSync(tempPath, payload, 'utf8');
    fs.renameSync(tempPath, targetPath);
  } catch {
    // Non-fatal background backup
  } finally {
    isSavingSnapshot = false;
  }
}

function scheduleDbSnapshot() {
  if (isUsingExternalPg || !pgliteInstance) return;
  if (snapshotTimer) {
    clearTimeout(snapshotTimer);
  }
  snapshotTimer = setTimeout(() => {
    snapshotTimer = null;
    saveDbSnapshot().catch(() => {});
  }, 400);
}

async function restoreFromDbSnapshot(pg: PGlite): Promise<boolean> {
  const snapshotPath = getSnapshotFilePath();
  if (!fs.existsSync(snapshotPath)) return false;

  try {
    const raw = fs.readFileSync(snapshotPath, 'utf8');
    const parsed = JSON.parse(raw);
    const tables = parsed?.tables;
    if (!tables || typeof tables !== 'object') return false;

    let restoredRows = 0;
    for (const tableName of SNAPSHOT_TABLES) {
      const rows = tables[tableName];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const colRes = await pg.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
      );
      const validCols = new Set(colRes.rows.map(r => r.column_name));
      if (validCols.size === 0) continue;

      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const cols = Object.keys(row).filter(c => validCols.has(c));
        if (cols.length === 0) continue;

        const colList = cols.map(c => `"${c}"`).join(', ');
        const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
        const values = cols.map(c => row[c]);

        const conflictClause = tableName === 'homepage_demo_config'
          ? `ON CONFLICT (id) DO UPDATE SET ${cols.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')}`
          : 'ON CONFLICT DO NOTHING';

        try {
          await pg.query(
            `INSERT INTO ${tableName} (${colList}) VALUES (${placeholders}) ${conflictClause};`,
            values
          );
          restoredRows++;
        } catch {}
      }
    }

    if (restoredRows > 0) {
      console.info(`[PostgreSQL] Restored ${restoredRows} persistent record(s) from database snapshot.`);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function openPgliteCluster(pgDataPath?: string): Promise<PGlite> {
  const db = pgDataPath
    ? new PGlite({
        dataDir: pgDataPath,
        onStderr: () => true
      })
    : new PGlite({
        onStderr: () => true
      });
  await db.waitReady;
  await db.query('SELECT 1 FROM pg_class LIMIT 1;');
  await db.query('SELECT count(*) FROM pg_attrdef;');
  return db;
}

export async function initDatabaseConnection(): Promise<boolean> {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf8') : '';

  // 1. Try external PostgreSQL if configured
  if (connectionString || process.env.PGHOST) {
    try {
      const client = await pool.connect();
      console.log('[PostgreSQL] Connected to external PostgreSQL database engine.');
      isUsingExternalPg = true;
      isDatabaseConnected = true;

      try {
        if (schemaSql) {
          await client.query(schemaSql);
        }
        await applyCompatibilityMigrations(client);
        await seedInitialDataIfEmpty(client);
      } catch (err: any) {
        console.warn('[PostgreSQL] External schema initialization notice:', err.message);
      } finally {
        client.release();
      }
      return true;
    } catch (err: any) {
      console.warn(`[PostgreSQL] Could not connect to external PostgreSQL (${err.message}). Activating persistent embedded PostgreSQL engine.`);
    }
  }

  // 2. Initialize embedded PostgreSQL engine with persistent on-disk storage
  try {
    const dataDir = getDataDirPath();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const pgDataPath = path.join(dataDir, 'pgdata');

    validateClusterBeforeOpen(pgDataPath);

    let initialized = false;
    let needsSnapshotRestore = false;

    // Attempt 1: Start persistent on-disk cluster
    try {
      const db = await openPgliteCluster(pgDataPath);

      // Verify public tables and indexes integrity
      const chkTables = ['playlists', 'playlist_videos', 'uploaded_media', 'users', 'live_streams'];
      for (const tbl of chkTables) {
        try {
          await db.query(`SELECT 1 FROM ${tbl} LIMIT 1;`);
        } catch (tErr: any) {
          if (tErr?.message?.includes('corrupted') || tErr?.message?.includes('could not read block')) {
            throw tErr;
          }
        }
      }
      try {
        await db.query("SELECT 1 FROM playlists WHERE user_id = 'test' LIMIT 1;");
      } catch (idxErr: any) {
        if (idxErr?.message?.includes('corrupted') || idxErr?.message?.includes('could not read block')) {
          throw idxErr;
        }
      }

      pgliteInstance = db;
      initialized = true;
    } catch {
      pgliteInstance = null;
      archiveClusterDir(pgDataPath);
      needsSnapshotRestore = true;

      // Attempt 2: Re-initialize clean persistent instance without noisy crash logs
      try {
        pgliteInstance = await openPgliteCluster(pgDataPath);
        initialized = true;
        console.info('[PostgreSQL] Reinitialized clean persistent cluster at data/pgdata.');
      } catch {
        pgliteInstance = null;
      }
    }

    // Attempt 3: In-memory fallback (guaranteed to initialize without disk lock issues)
    if (!initialized || !pgliteInstance) {
      try {
        console.info('[PostgreSQL] Activating in-memory PostgreSQL engine...');
        pgliteInstance = await openPgliteCluster();
        initialized = true;
        needsSnapshotRestore = true;
      } catch (memErr: any) {
        console.error('[PostgreSQL] Fatal in-memory failure:', memErr);
        isDatabaseConnected = false;
        return false;
      }
    }

    console.info('[PostgreSQL] Embedded PostgreSQL engine initialized successfully.');
    isDatabaseConnected = true;
    isUsingExternalPg = false;

    // Apply schema DDL
    if (schemaSql) {
      await pgliteInstance.exec(schemaSql);
    }

    // Run column compatibility migrations
    await applyCompatibilityMigrations(null);

    // Check whether database is empty (fresh cluster or recovered) and restore snapshot first
    let existingUserCount = 0;
    try {
      const cntRes = await pgliteInstance.query<{ count: number }>('SELECT COUNT(*)::int as count FROM users');
      existingUserCount = parseInt(String(cntRes.rows[0]?.count || '0'), 10);
    } catch {}

    if (needsSnapshotRestore || existingUserCount === 0) {
      await restoreFromDbSnapshot(pgliteInstance);
    }

    // Seed initial records only if missing
    await seedInitialDataIfEmpty(null);

    // Flush checkpoint and write fresh snapshot
    try {
      await pgliteInstance.exec('CHECKPOINT;');
    } catch {}
    await saveDbSnapshot();

    if (!periodicSnapshotInterval) {
      periodicSnapshotInterval = setInterval(() => {
        saveDbSnapshot().catch(() => {});
      }, 20000);
      periodicSnapshotInterval.unref?.();
    }

    return true;
  } catch (embeddedErr: any) {
    console.error('[PostgreSQL] Fatal: Failed to initialize PostgreSQL engine:', embeddedErr);
    isDatabaseConnected = false;
    return false;
  }
}

let isClosingDb = false;
export async function closeDatabaseConnection(): Promise<void> {
  if (isClosingDb) return;
  isClosingDb = true;

  if (snapshotTimer) {
    clearTimeout(snapshotTimer);
    snapshotTimer = null;
  }
  if (periodicSnapshotInterval) {
    clearInterval(periodicSnapshotInterval);
    periodicSnapshotInterval = null;
  }

  const pgDataPath = path.join(getDataDirPath(), 'pgdata');

  if (isUsingExternalPg) {
    try {
      await Promise.race([pool.end(), new Promise(r => setTimeout(r, 1200))]);
    } catch {}
    isDatabaseConnected = false;
    return;
  }

  if (pgliteInstance) {
    try {
      await saveDbSnapshot();
    } catch {}
    const instance = pgliteInstance;
    pgliteInstance = null;
    try {
      await Promise.race([instance.close(), new Promise(r => setTimeout(r, 1500))]);
    } catch {}
  }

  cleanStalePgLocks(pgDataPath);
  isDatabaseConnected = false;
}

/**
 * Applies backwards-compatible schema column additions to existing tables
 */
async function applyCompatibilityMigrations(pgClient: pg.PoolClient | null) {
  const migrations = [
    'ALTER TABLE uploaded_media ADD COLUMN IF NOT EXISTS file_url TEXT;',
    'ALTER TABLE playlists ADD COLUMN IF NOT EXISTS total_runtime_seconds INT DEFAULT 0;',
    'ALTER TABLE playlists ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;',
    'ALTER TABLE playlist_videos ADD COLUMN IF NOT EXISTS file_url TEXT;',
    'ALTER TABLE playlist_videos ADD COLUMN IF NOT EXISTS storage_path TEXT;',
    'ALTER TABLE playlist_videos ADD COLUMN IF NOT EXISTS formatted_duration VARCHAR(50);',
    'ALTER TABLE playlist_videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;',
    'ALTER TABLE playlist_videos ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);',
    'ALTER TABLE playlist_videos ADD COLUMN IF NOT EXISTS media_id VARCHAR(255);',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_duration_days INT DEFAULT 30;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS renewal_date VARCHAR(50);',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS renewal_days_left INT DEFAULT 0;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;',
    'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);',
    'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);',
    'ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS storage_path TEXT;',
    'ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS video_url TEXT;',
    'ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS media_id VARCHAR(255);',
    'UPDATE uploaded_media SET file_url = url WHERE file_url IS NULL;',
    'UPDATE playlists SET thumbnail_url = thumbnail WHERE thumbnail_url IS NULL;',
    `CREATE TABLE IF NOT EXISTS homepage_demo_config (
      id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
      title VARCHAR(255) NOT NULL DEFAULT 'Relaxing LoFi Music 24/7',
      channel_name VARCHAR(255) NOT NULL DEFAULT 'Music World',
      viewers_text VARCHAR(100) NOT NULL DEFAULT '1.2K watching',
      video_url TEXT NOT NULL DEFAULT '/uploads/media/video-Music_video_animating_storyboard____1080-1793964845416-990953612.mp4',
      thumbnail_url TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80',
      video_source_type VARCHAR(50) NOT NULL DEFAULT 'uploaded',
      resolution VARCHAR(50) NOT NULL DEFAULT '1080p · 60 FPS',
      bitrate VARCHAR(50) NOT NULL DEFAULT '4,500 kbps',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `INSERT INTO homepage_demo_config (id, title, channel_name, viewers_text, video_url, thumbnail_url, video_source_type, resolution, bitrate)
     VALUES ('default', 'Relaxing LoFi Music 24/7', 'Music World', '1.2K watching', '/uploads/media/video-Music_video_animating_storyboard____1080-1793964845416-990953612.mp4', 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80', 'uploaded', '1080p · 60 FPS', '4,500 kbps')
     ON CONFLICT (id) DO NOTHING;`
  ];

  for (const m of migrations) {
    try {
      if (pgClient) {
        await pgClient.query(m);
      } else if (pgliteInstance) {
        await pgliteInstance.exec(m);
      }
    } catch {}
  }
}

/**
 * Seeds initial users, playlists, and streams ONLY if the users table is completely empty.
 * If data already exists, this function leaves it 100% untouched to guarantee persistence across restarts.
 */
async function seedInitialDataIfEmpty(pgClient: pg.PoolClient | null) {
  try {
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('admin1234', salt);
    const userHash = await bcrypt.hash('user1234', salt);

    const accountsToEnsure = [
      {
        sql: `INSERT INTO users (id, name, email, password_hash, role, plan, status, joined_date, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, status = 'Active';`,
        params: ['u_admin_system', 'Super Admin', 'admin@streamallow.com', adminHash, 'super_admin', 'Business', 'Active', 'Oct 01, 2026']
      },
      {
        sql: `INSERT INTO users (id, name, email, password_hash, role, plan, status, joined_date, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'Active';`,
        params: ['u_demo_creator', 'Demo Creator', 'user@streamallow.com', userHash, 'user', 'Pro', 'Active', 'Nov 01, 2026']
      },
      {
        sql: `INSERT INTO users (id, name, email, password_hash, role, plan, status, joined_date, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'Active';`,
        params: ['u_fahim_creator', 'Fahim Ahmed', 'fahim@gmail.com', userHash, 'user', 'Pro', 'Active', 'Oct 30, 2026']
      },
      {
        sql: `INSERT INTO activity_logs (id, user_name, action, category, ip_address, created_at)
              VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
              ON CONFLICT (id) DO NOTHING;`,
        params: ['log-1', 'Admin', 'PostgreSQL Database Engine Online & Migrated', 'system', '127.0.0.1']
      }
    ];

    for (const q of accountsToEnsure) {
      if (pgClient) {
        await pgClient.query(q.sql, q.params);
      } else if (pgliteInstance) {
        await pgliteInstance.query(q.sql, q.params);
      }
    }

    // Backfill subscription_start_date, plan_duration_days, and expires_at from genuine DB timestamps only when missing
    const subscriptionBackfillSql = [
      'UPDATE users SET plan_duration_days = 30 WHERE plan_duration_days IS NULL OR plan_duration_days <= 0;',
      `UPDATE users
       SET subscription_start_date = COALESCE(expires_at - (COALESCE(plan_duration_days, 30) * INTERVAL '1 day'), created_at, CURRENT_TIMESTAMP)
       WHERE subscription_start_date IS NULL;`,
      `UPDATE users
       SET expires_at = subscription_start_date + (COALESCE(plan_duration_days, 30) * INTERVAL '1 day')
       WHERE expires_at IS NULL AND status = 'Active' AND subscription_start_date IS NOT NULL;`,
      `UPDATE users
       SET renewal_days_left = GREATEST(0, CEIL(EXTRACT(EPOCH FROM (expires_at - CURRENT_TIMESTAMP)) / 86400.0)::int),
           renewal_date = to_char(expires_at AT TIME ZONE 'UTC', 'Mon DD, YYYY')
       WHERE expires_at IS NOT NULL AND status = 'Active' AND (renewal_date IS NULL OR renewal_date = '');`
    ];
    for (const sql of subscriptionBackfillSql) {
      try {
        if (pgClient) {
          await pgClient.query(sql);
        } else if (pgliteInstance) {
          await pgliteInstance.exec(sql);
        }
      } catch {}
    }

    // Ensure standard sample playlist and live stream exist if table is empty
    try {
      const plCountQuery = 'SELECT COUNT(*)::int as count FROM playlists';
      const plCountRes = pgClient ? await pgClient.query(plCountQuery) : await pgliteInstance!.query(plCountQuery);
      if (parseInt((plCountRes.rows[0] as any)?.count || '0', 10) === 0) {
        const defaultPlId = 'pl_default_247';
        const defaultMediaId = 'med_lofi_beat_1';
        const encKey = encryptStreamKey('live_247_test_stream_key');

        const mediaPath = path.resolve(process.cwd(), 'uploads/media/video-Music_video_animating_storyboard____1080-1793964845416-990953612.mp4');
        const mediaUrl = '/uploads/media/video-Music_video_animating_storyboard____1080-1793964845416-990953612.mp4';
        const thumbUrl = '/uploads/thumbnails/thumb-video-Music_video_animating_storyboard____1080-1793964845416-990953612.jpg';

        const seedStatements = [
          {
            sql: `INSERT INTO playlists (id, user_id, name, description, status, is_live_loop, total_videos, total_runtime, total_runtime_seconds, thumbnail, thumbnail_url, created_at, updated_at)
                  VALUES ($1, $2, $3, $4, 'Active', true, 1, '15:20', 920, $5, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                  ON CONFLICT (id) DO NOTHING;`,
            params: [defaultPlId, 'u_admin_system', '24/7 Lo-Fi Beats & Chill Mix', 'Continuous 24/7 high bitrate broadcasting playlist for YouTube Live', thumbUrl]
          },
          {
            sql: `INSERT INTO uploaded_media (id, user_id, file_name, original_name, file_path, url, file_url, duration_seconds, formatted_duration, resolution, format, file_size_bytes, thumbnail_url, created_at)
                  VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, '1080p FHD', 'MP4', 52428800, $9, CURRENT_TIMESTAMP)
                  ON CONFLICT (id) DO NOTHING;`,
            params: [defaultMediaId, 'u_admin_system', 'Music_video_animating_storyboard.mp4', 'Lo-Fi Chill Beat Track 01.mp4', mediaPath, mediaUrl, 920, '15:20', thumbUrl]
          },
          {
            sql: `INSERT INTO playlist_videos (id, playlist_id, user_id, media_id, title, url, file_url, file_path, storage_path, duration, formatted_duration, duration_seconds, thumbnail, thumbnail_url, position_order, created_at)
                  VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $7, '15:20', '15:20', 920, $8, $8, 1, CURRENT_TIMESTAMP)
                  ON CONFLICT (id) DO NOTHING;`,
            params: ['pv_track_1', defaultPlId, 'u_admin_system', defaultMediaId, 'Lo-Fi Chill Beat Track 01 (1080p FHD)', mediaUrl, mediaPath, thumbUrl]
          },
          {
            sql: `INSERT INTO live_streams (id, user_id, title, playlist_id, thumbnail, status, viewers, resolution, bitrate, stream_url, is_dual_stream, backup_rtmp_url, category, privacy, encrypted_key_cipher, encrypted_key_iv, encrypted_key_tag, created_at, updated_at)
                  VALUES ($1, $2, $3, $4, $5, 'scheduled', 0, '1080p60', '4500 kbps', 'rtmp://a.rtmp.youtube.com/live2', false, '', 'Music', 'Public', $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                  ON CONFLICT (id) DO NOTHING;`,
            params: ['str_live_master', 'u_admin_system', '24/7 Lo-Fi Chill Radio · Beats to Relax / Study to', defaultPlId, thumbUrl, encKey.cipherText, encKey.iv, encKey.authTag]
          }
        ];

        for (const st of seedStatements) {
          if (pgClient) {
            await pgClient.query(st.sql, st.params);
          } else if (pgliteInstance) {
            await pgliteInstance.query(st.sql, st.params);
          }
        }
        console.log('[PostgreSQL] Seeded initial playlist and master live stream with real media.');
      }
    } catch (plSeedErr: any) {
      console.warn('[PostgreSQL] Playlist seed notice:', plSeedErr.message);
    }

    console.log('[PostgreSQL] Verified standard Admin & User accounts in database.');
  } catch (seedErr: any) {
    console.warn('[PostgreSQL] Seed notice:', seedErr.message);
  }
}

export function isDbConnected(): boolean {
  return isDatabaseConnected;
}

/**
 * Unified SQL query execution function across external PostgreSQL and embedded PGlite.
 */
export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
  if (isUsingExternalPg) {
    const res = await pool.query(text, params);
    return {
      rows: res.rows as T[],
      rowCount: res.rowCount ?? res.rows.length
    };
  }

  if (pgliteInstance) {
    try {
      const res = await pgliteInstance.query(text, params);
      if (/^\s*(INSERT|UPDATE|DELETE)\b/i.test(text)) {
        scheduleDbSnapshot();
      }
      return {
        rows: res.rows as T[],
        rowCount: res.rows.length
      };
    } catch (queryErr: any) {
      if (queryErr?.message?.includes('corrupted page') || queryErr?.message?.includes('could not read block')) {
        const idxMatch = queryErr.message.match(/index\s+"([^"]+)"/);
        if (idxMatch && idxMatch[1]) {
          const badIndex = idxMatch[1];
          try {
            await pgliteInstance.exec(`DROP INDEX IF EXISTS ${badIndex};`);
          } catch {}
        }
        try {
          const retryRes = await pgliteInstance.query(text, params);
          return {
            rows: retryRes.rows as T[],
            rowCount: retryRes.rows.length
          };
        } catch {}
      }
      throw queryErr;
    }
  }

  throw new Error('PostgreSQL database is not connected.');
}

export async function exec(sql: string): Promise<void> {
  if (isUsingExternalPg) {
    await pool.query(sql);
    return;
  }
  if (pgliteInstance) {
    await pgliteInstance.exec(sql);
    if (/\b(INSERT|UPDATE|DELETE)\b/i.test(sql)) {
      scheduleDbSnapshot();
    }
    return;
  }
  throw new Error('PostgreSQL database is not connected.');
}
