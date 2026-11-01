import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL Connection Pool configuration
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
  connectionTimeoutMillis: 2000,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
});

// Prevent unhandled errors from terminating the Node process
pool.on('error', (err) => {
  console.warn('[PostgreSQL Pool] Notice:', err.message);
});

let isDatabaseConnected = false;

export async function initDatabaseConnection(): Promise<boolean> {
  if (!connectionString && !process.env.PGHOST) {
    console.log('[PostgreSQL] No DATABASE_URL configured. Running with in-memory adapter mode for seamless preview.');
    return false;
  }

  try {
    const client = await pool.connect();
    console.log('[PostgreSQL] Connected successfully to PostgreSQL database engine.');
    isDatabaseConnected = true;

    // Check if tables exist, if not apply schema.sql
    try {
      const res = await client.query("SELECT to_regclass('public.users') as exists;");
      if (!res.rows[0]?.exists) {
        console.log('[PostgreSQL] Initializing tables from schema.sql...');
        const schemaPath = path.resolve(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf8');
          await client.query(sql);
          console.log('[PostgreSQL] Schema initialized successfully.');
        }
      }
    } catch (schemaErr) {
      console.warn('[PostgreSQL] Auto-schema initialization warning:', schemaErr);
    } finally {
      client.release();
    }
    return true;
  } catch (err: any) {
    console.warn('[PostgreSQL] Notice: Could not connect to external PostgreSQL server (' + err.message + '). Active in graceful fallback mode.');
    isDatabaseConnected = false;
    return false;
  }
}

export function isDbConnected(): boolean {
  return isDatabaseConnected;
}

export async function query(text: string, params?: any[]) {
  if (!isDatabaseConnected) {
    throw new Error('Database is currently not connected. Using memory store.');
  }
  return pool.query(text, params);
}
