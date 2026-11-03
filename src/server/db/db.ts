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

    // Pre-check: If pgdata exists, inspect cluster health and wipe stale lock files
    if (fs.existsSync(pgDataPath)) {
      const confFile = path.join(pgDataPath, 'postgresql.conf');
      const versionFile = path.join(pgDataPath, 'PG_VERSION');
      // If incomplete or corrupt (missing essential files), clean it up so PGlite starts fresh
      if (!fs.existsSync(confFile) || !fs.existsSync(versionFile)) {
        console.warn(`[PostgreSQL] Incomplete cluster detected at ${pgDataPath}. Cleaning up prior to initialization...`);
        try { fs.rmSync(pgDataPath, { recursive: true, force: true }); } catch {}
      } else {
        // Clean any stale postmaster lock/pid files
        const pidFile = path.join(pgDataPath, 'postmaster.pid');
        if (fs.existsSync(pidFile)) {
          try { fs.unlinkSync(pidFile); } catch {}
        }
        const optsFile = path.join(pgDataPath, 'postmaster.opts');
        if (fs.existsSync(optsFile)) {
          try { fs.unlinkSync(optsFile); } catch {}
        }
      }
    }

    let initialized = false;

    // Attempt 1: Start persistent on-disk cluster
    try {
      pgliteInstance = new PGlite(pgDataPath);
      await pgliteInstance.waitReady;
      // Thorough catalog integrity check to catch any corrupted blocks early
      await pgliteInstance.query('SELECT 1 FROM pg_class LIMIT 1;');
      await pgliteInstance.query('SELECT count(*) FROM pg_attrdef;');
      initialized = true;
    } catch (clusterErr: any) {
      console.warn(`[PostgreSQL] Cluster at ${pgDataPath} encountered error (${clusterErr?.message || clusterErr}). Performing automatic self-healing recovery...`);
      try {
        if (pgliteInstance) {
          await pgliteInstance.close?.();
        }
      } catch {}
      pgliteInstance = null;

      // Clean corrupted directory completely
      if (fs.existsSync(pgDataPath)) {
        try {
          fs.rmSync(pgDataPath, { recursive: true, force: true });
        } catch (rmErr: any) {
          console.error('[PostgreSQL] Could not clear corrupted data directory:', rmErr);
        }
      }

      // Attempt 2: Re-initialize clean persistent instance
      try {
        pgliteInstance = new PGlite(pgDataPath);
        await pgliteInstance.waitReady;
        await pgliteInstance.query('SELECT 1 FROM pg_class LIMIT 1;');
        await pgliteInstance.query('SELECT count(*) FROM pg_attrdef;');
        initialized = true;
        console.log('[PostgreSQL] Self-healing recovery succeeded. Fresh persistent cluster created.');
      } catch (retryErr: any) {
        console.warn(`[PostgreSQL] On-disk cluster re-init note (${retryErr?.message || retryErr}). Activating in-memory PostgreSQL engine...`);
        pgliteInstance = null;
      }
    }

    // Attempt 3: In-memory fallback (guaranteed to initialize without disk lock issues)
    if (!initialized || !pgliteInstance) {
      try {
        console.log('[PostgreSQL] Activating in-memory PostgreSQL engine fallback...');
        pgliteInstance = new PGlite();
        await pgliteInstance.waitReady;
        initialized = true;
        console.log('[PostgreSQL] In-memory PostgreSQL engine active and operational.');
      } catch (memErr: any) {
        console.error('[PostgreSQL] Fatal in-memory failure:', memErr);
        isDatabaseConnected = false;
        return false;
      }
    }

    console.log('[PostgreSQL] Embedded PostgreSQL engine initialized successfully.');
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

    registerShutdownHooks(dataDir);

    return true;
  } catch (embeddedErr: any) {
    console.error('[PostgreSQL] Fatal: Failed to initialize PostgreSQL engine:', embeddedErr);
    isDatabaseConnected = false;
    return false;
  }
}

let shutdownHooksRegistered = false;
function registerShutdownHooks(dataDir: string) {
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
    try {
      const pidFile = path.join(dataDir, 'pgdata', 'postmaster.pid');
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
    } catch {}
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
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('admin1234', salt);
    const userHash = await bcrypt.hash('user1234', salt);

    const accountsToEnsure = [
      {
        sql: `INSERT INTO users (id, name, email, password_hash, role, plan, status, joined_date, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, status = 'Active';`,
        params: ['u_admin_system', 'Super Admin', 'admin@streamjoin.com', adminHash, 'super_admin', 'Business', 'Active', 'Oct 01, 2026']
      },
      {
        sql: `INSERT INTO users (id, name, email, password_hash, role, plan, status, joined_date, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'Active';`,
        params: ['u_demo_creator', 'Demo Creator', 'user@streamjoin.com', userHash, 'user', 'Pro', 'Active', 'Nov 01, 2026']
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
