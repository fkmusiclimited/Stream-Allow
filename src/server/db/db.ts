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
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const pgDataPath = path.join(dataDir, 'pgdata');
    const pidFile = path.join(pgDataPath, 'postmaster.pid');
    if (fs.existsSync(pidFile)) {
      try { fs.unlinkSync(pidFile); } catch {}
    }

    try {
      pgliteInstance = new PGlite(pgDataPath);
      await pgliteInstance.waitReady;
    } catch (clusterErr: any) {
      console.warn(`[PostgreSQL] Cluster at ${pgDataPath} encountered error (${clusterErr?.message || clusterErr}). Performing automatic self-healing recovery...`);
      try {
        if (pgliteInstance) {
          try { await pgliteInstance.close(); } catch {}
          pgliteInstance = null;
        }
      } catch {}

      if (fs.existsSync(pgDataPath)) {
        try {
          fs.rmSync(pgDataPath, { recursive: true, force: true });
        } catch (rmErr: any) {
          console.error('[PostgreSQL] Could not clear corrupted data directory:', rmErr);
        }
      }

      // Re-initialize clean persistent instance
      pgliteInstance = new PGlite(pgDataPath);
      await pgliteInstance.waitReady;
      console.log('[PostgreSQL] Self-healing recovery succeeded. Fresh persistent cluster created.');
    }

    console.log('[PostgreSQL] Embedded persistent PostgreSQL engine initialized at:', pgDataPath);
    isDatabaseConnected = true;
    isUsingExternalPg = false;

    // Apply schema DDL
    if (schemaSql) {
      await pgliteInstance.exec(schemaSql);
    }

    // Seed initial records only if the database is newly initialized
    await seedInitialDataIfEmpty(null);

    // Flush checkpoint to ensure cleanly recorded WAL on disk
    try {
      await pgliteInstance.exec('CHECKPOINT;');
    } catch {}

    registerShutdownHooks();

    return true;
  } catch (embeddedErr: any) {
    console.error('[PostgreSQL] Fatal: Failed to initialize PostgreSQL engine:', embeddedErr);
    isDatabaseConnected = false;
    return false;
  }
}

let shutdownHooksRegistered = false;
function registerShutdownHooks() {
  if (shutdownHooksRegistered) return;
  shutdownHooksRegistered = true;

  const cleanShutdown = async (signal: string) => {
    if (pgliteInstance) {
      try {
        await pgliteInstance.exec('CHECKPOINT;');
        await pgliteInstance.close();
      } catch {}
      pgliteInstance = null;
    }
  };

  process.once('SIGTERM', () => { cleanShutdown('SIGTERM'); });
  process.once('SIGINT', () => { cleanShutdown('SIGINT'); });
  process.once('beforeExit', () => { cleanShutdown('beforeExit'); });
}

/**
 * Seeds initial users, playlists, and streams ONLY if the users table is completely empty.
 * If data already exists, this function leaves it 100% untouched to guarantee persistence across restarts.
 */
async function seedInitialDataIfEmpty(pgClient: pg.PoolClient | null) {
  try {
    const checkQuery = 'SELECT COUNT(*)::int as count FROM users;';
    let count = 0;
    if (pgClient) {
      const res = await pgClient.query(checkQuery);
      count = res.rows[0]?.count || 0;
    } else if (pgliteInstance) {
      const res = await pgliteInstance.query<{ count: number }>(checkQuery);
      count = res.rows[0]?.count || 0;
    }

    if (count > 0) {
      console.log(`[PostgreSQL] Database already populated (${count} users found). Preserving all persistent records.`);
      return;
    }

    console.log('[PostgreSQL] Fresh database detected. Seeding initial accounts and baseline playlists...');

    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('admin1234', salt);
    const userHash = await bcrypt.hash('password123', salt);

    const seedQueries = [
      {
        sql: `INSERT INTO users (id, name, email, password_hash, role, plan, status, joined_date)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (email) DO NOTHING;`,
        params: ['u-admin', 'Super Admin', 'admin@streamjoin.com', adminHash, 'super_admin', 'Business', 'Active', 'Oct 01, 2026']
      },
      {
        sql: `INSERT INTO users (id, name, email, password_hash, role, plan, status, joined_date)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (email) DO NOTHING;`,
        params: ['u-1', 'Fahim Ahmed', 'fahim@streamjoin.com', userHash, 'user', 'Pro', 'Active', 'Oct 30, 2026']
      },
      {
        sql: `INSERT INTO playlists (id, user_id, name, description, status, is_live_loop, total_videos, total_runtime, thumbnail)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (id) DO NOTHING;`,
        params: ['pl-1', 'u-1', 'Relaxing Music', 'Continuous ambient beats and relaxing instruments for 24/7 stream', 'Active', true, 2, '27:45', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80']
      },
      {
        sql: `INSERT INTO playlist_videos (id, playlist_id, title, duration, duration_seconds, resolution, format, url, thumbnail, position_order)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT (id) DO NOTHING;`,
        params: ['v-1', 'pl-1', 'Deep Ambient Lo-Fi Tape #1 (Rain & Beats)', '12:45', 765, '1080p FHD', 'MP4 Loop', 'https://cdn.streamjoin.com/media/ambient1.mp4', 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80', 1]
      },
      {
        sql: `INSERT INTO playlist_videos (id, playlist_id, title, duration, duration_seconds, resolution, format, url, thumbnail, position_order)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT (id) DO NOTHING;`,
        params: ['v-2', 'pl-1', 'Midnight Chill Beats - Urban Tokyo Mix', '15:00', 900, '1080p FHD', 'MP4 Loop', 'https://cdn.streamjoin.com/media/loop-track.mp4', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80', 2]
      },
      {
        sql: `INSERT INTO playlists (id, user_id, name, description, status, is_live_loop, total_videos, total_runtime, thumbnail)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (id) DO NOTHING;`,
        params: ['pl-2', 'u-1', 'Study Music', 'Focus piano and binaural study tracks', 'Scheduled', true, 0, '00:00', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80']
      }
    ];

    const encryptedKey1 = encryptStreamKey('stream_key_placeholder_music_1');
    const encryptedKey2 = encryptStreamKey('stream_key_placeholder_study_2');

    seedQueries.push(
      {
        sql: `INSERT INTO live_streams (id, user_id, playlist_id, title, thumbnail, status, viewers, resolution, bitrate, stream_url, is_dual_stream, backup_rtmp_url, category, privacy, encrypted_key_cipher, encrypted_key_iv, encrypted_key_tag)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
              ON CONFLICT (id) DO NOTHING;`,
        params: ['str-1', 'u-1', 'pl-1', 'Relaxing Music Live', 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80', 'scheduled', 0, '1080p60', '4500 kbps', 'rtmp://a.rtmp.youtube.com/live2', false, '', 'Music', 'Public', encryptedKey1.cipherText, encryptedKey1.iv, encryptedKey1.authTag]
      },
      {
        sql: `INSERT INTO live_streams (id, user_id, playlist_id, title, thumbnail, status, viewers, resolution, bitrate, stream_url, is_dual_stream, backup_rtmp_url, category, privacy, encrypted_key_cipher, encrypted_key_iv, encrypted_key_tag)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
              ON CONFLICT (id) DO NOTHING;`,
        params: ['str-2', 'u-1', 'pl-2', 'Study With Me Live', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80', 'scheduled', 0, '1080p60', '4000 kbps', 'rtmp://a.rtmp.youtube.com/live2', false, '', 'Music', 'Public', encryptedKey2.cipherText, encryptedKey2.iv, encryptedKey2.authTag]
      },
      {
        sql: `INSERT INTO transactions (id, user_id, invoice_number, plan, amount_usd, amount_bdt, currency, status, gateway, transaction_ref, date_str)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              ON CONFLICT (id) DO NOTHING;`,
        params: ['tx-1', 'u-1', 'INV-2026-001', 'Pro Plan (Monthly)', 29, 2990, 'BDT', 'Paid', 'bKash', 'BKH98341201', 'Oct 30, 2026']
      },
      {
        sql: `INSERT INTO activity_logs (id, user_name, action, category, ip_address)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (id) DO NOTHING;`,
        params: ['log-1', 'Admin', 'PostgreSQL Database Engine Online & Migrated', 'system', '127.0.0.1']
      }
    );

    for (const q of seedQueries) {
      if (pgClient) {
        await pgClient.query(q.sql, q.params);
      } else if (pgliteInstance) {
        await pgliteInstance.query(q.sql, q.params);
      }
    }

    console.log('[PostgreSQL] Seed data successfully committed.');
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
    const res = await pgliteInstance.query(text, params);
    return {
      rows: res.rows as T[],
      rowCount: res.rows.length
    };
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
    return;
  }
  throw new Error('PostgreSQL database is not connected.');
}
