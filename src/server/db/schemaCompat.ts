export type CanonicalStreamStatus = 'scheduled' | 'live' | 'ended' | 'failed';
export type CanonicalPlaylistStatus = 'Scheduled' | 'Active' | 'Live' | 'Ended';

export type QueryExecutor = <T = any>(
  text: string,
  params?: any[]
) => Promise<{ rows: T[]; rowCount: number }>;

export interface ColumnMeta {
  dataType: string;
  udtName: string;
  isNullable: boolean;
}

export interface DbSchemaMeta {
  initialized: boolean;
  tables: Set<string>;
  columnsByTable: Map<string, Map<string, ColumnMeta>>;
  enumsByType: Map<string, string[]>;
  streamTableName: 'streams' | 'live_streams';
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const schemaMeta: DbSchemaMeta = {
  initialized: false,
  tables: new Set<string>(),
  columnsByTable: new Map<string, Map<string, ColumnMeta>>(),
  enumsByType: new Map<string, string[]>(),
  streamTableName: 'live_streams'
};

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

export function getDbSchemaMeta(): DbSchemaMeta {
  return schemaMeta;
}

export function getStreamTableName(): 'streams' | 'live_streams' {
  return schemaMeta.streamTableName;
}

export function hasTable(tableName: string): boolean {
  return schemaMeta.tables.has(tableName);
}

export function hasColumn(tableName: string, columnName: string): boolean {
  const cols = schemaMeta.columnsByTable.get(tableName);
  if (!cols || cols.size === 0) return true; // Optimistic fallback before introspection
  return cols.has(columnName);
}

export function getColumnMeta(tableName: string, columnName: string): ColumnMeta | undefined {
  return schemaMeta.columnsByTable.get(tableName)?.get(columnName);
}

export function isUuidColumn(tableName: string, columnName: string): boolean {
  const meta = getColumnMeta(tableName, columnName);
  return meta?.udtName === 'uuid';
}

export function pickColumn(tableName: string, candidates: string[]): string | null {
  const cols = schemaMeta.columnsByTable.get(tableName);
  if (!cols || cols.size === 0) {
    return candidates[0] || null;
  }
  for (const candidate of candidates) {
    if (cols.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function getPlaylistVideosOrderCol(): string {
  return pickColumn('playlist_videos', ['position_order', 'order_index', 'sort_order', 'position']) || 'position_order';
}

export async function introspectDatabaseSchema(runQuery: QueryExecutor): Promise<DbSchemaMeta> {
  const nextTables = new Set<string>();
  const nextColumns = new Map<string, Map<string, ColumnMeta>>();
  const nextEnums = new Map<string, string[]>();

  try {
    const tablesRes = await runQuery<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    for (const row of tablesRes.rows) {
      if (row.table_name) {
        nextTables.add(row.table_name);
      }
    }

    const colsRes = await runQuery<{
      table_name: string;
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: string;
    }>(
      `SELECT table_name, column_name, data_type, udt_name, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
       ORDER BY table_name, ordinal_position`
    );

    for (const row of colsRes.rows) {
      let tableCols = nextColumns.get(row.table_name);
      if (!tableCols) {
        tableCols = new Map<string, ColumnMeta>();
        nextColumns.set(row.table_name, tableCols);
      }
      tableCols.set(row.column_name, {
        dataType: row.data_type,
        udtName: row.udt_name,
        isNullable: row.is_nullable === 'YES'
      });
    }

    const enumsRes = await runQuery<{ typname: string; enumlabel: string }>(
      `SELECT t.typname, e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       ORDER BY t.typname, e.enumsortorder`
    );
    for (const row of enumsRes.rows) {
      const list = nextEnums.get(row.typname) || [];
      list.push(row.enumlabel);
      nextEnums.set(row.typname, list);
    }

    let resolvedStreamTable: 'streams' | 'live_streams' = 'live_streams';
    const hasStreams = nextTables.has('streams');
    const hasLiveStreams = nextTables.has('live_streams');
    if (hasStreams && !hasLiveStreams) {
      resolvedStreamTable = 'streams';
    } else if (hasStreams && hasLiveStreams) {
      try {
        const sCount = await runQuery<{ count: number }>('SELECT COUNT(*)::int as count FROM streams');
        const lsCount = await runQuery<{ count: number }>('SELECT COUNT(*)::int as count FROM live_streams');
        const streamsRows = Number(sCount.rows[0]?.count || 0);
        const liveStreamsRows = Number(lsCount.rows[0]?.count || 0);
        if (streamsRows > 0 && liveStreamsRows === 0) {
          resolvedStreamTable = 'streams';
        }
      } catch {}
    }

    schemaMeta.initialized = true;
    schemaMeta.tables = nextTables;
    schemaMeta.columnsByTable = nextColumns;
    schemaMeta.enumsByType = nextEnums;
    schemaMeta.streamTableName = resolvedStreamTable;
  } catch (err: any) {
    console.warn('[PostgreSQL Schema Compat] Introspection notice:', err?.message || err);
  }

  return schemaMeta;
}

function matchEnumLabel(allowedLabels: string[], preferences: string[]): string | null {
  if (!allowedLabels || allowedLabels.length === 0) return null;
  for (const pref of preferences) {
    const exact = allowedLabels.find(l => l === pref);
    if (exact) return exact;
    const ci = allowedLabels.find(l => l.toLowerCase() === pref.toLowerCase());
    if (ci) return ci;
  }
  return allowedLabels[0] || null;
}

/**
 * Resolves canonical stream status ('scheduled' | 'live' | 'ended' | 'failed')
 * against the actual PostgreSQL enum labels (e.g. stream_status_enum) if status is an enum column.
 */
export function resolveStreamStatusForDb(
  canonical: CanonicalStreamStatus,
  tableName: string = schemaMeta.streamTableName
): string {
  const statusCol = getColumnMeta(tableName, 'status');
  const enumLabels = statusCol ? schemaMeta.enumsByType.get(statusCol.udtName) : schemaMeta.enumsByType.get('stream_status_enum');

  // Only map against enum labels if the column itself is actually an enum type
  if (!statusCol || !enumLabels || enumLabels.length === 0) {
    return canonical;
  }

  const prefMap: Record<CanonicalStreamStatus, string[]> = {
    live: ['live', 'streaming', 'active', 'running', 'online'],
    scheduled: ['scheduled', 'pending', 'idle', 'draft', 'created', 'ready', 'waiting'],
    ended: ['ended', 'stopped', 'offline', 'completed', 'inactive', 'idle', 'finished'],
    failed: ['failed', 'error', 'crashed', 'ended', 'stopped', 'offline']
  };

  return matchEnumLabel(enumLabels, prefMap[canonical]) || canonical;
}

/**
 * Normalizes any DB stream status value (e.g., 'stopped', 'offline', 'LIVE', etc.)
 * back into the frontend's canonical StreamStatus union.
 */
export function normalizeStreamStatusFromDb(rawStatus: unknown): CanonicalStreamStatus {
  const s = String(rawStatus || 'scheduled').trim().toLowerCase();
  if (s === 'live' || s === 'streaming' || s === 'active' || s === 'running' || s === 'online') {
    return 'live';
  }
  if (s === 'ended' || s === 'stopped' || s === 'offline' || s === 'completed' || s === 'inactive' || s === 'finished') {
    return 'ended';
  }
  if (s === 'failed' || s === 'error' || s === 'crashed') {
    return 'failed';
  }
  return 'scheduled';
}

export function resolvePlaylistStatusForDb(canonical: CanonicalPlaylistStatus): string {
  const statusCol = getColumnMeta('playlists', 'status');
  const enumLabels = statusCol ? schemaMeta.enumsByType.get(statusCol.udtName) : undefined;
  if (!statusCol || !enumLabels || enumLabels.length === 0) {
    return canonical;
  }

  const prefMap: Record<CanonicalPlaylistStatus, string[]> = {
    Scheduled: ['Scheduled', 'scheduled', 'idle', 'pending', 'draft'],
    Active: ['Active', 'active', 'ready', 'scheduled', 'live'],
    Live: ['Live', 'live', 'active', 'streaming', 'running'],
    Ended: ['Ended', 'ended', 'stopped', 'offline', 'completed', 'inactive']
  };

  return matchEnumLabel(enumLabels, prefMap[canonical]) || canonical;
}

export function buildCompatibleInsert(
  tableName: string,
  columnValues: Array<[string | null | undefined, any]>,
  options?: {
    rawTimestampColumns?: string[];
    onConflict?: string;
    returning?: string;
  }
): { sql: string; params: any[] } {
  const cols: string[] = [];
  const placeholders: string[] = [];
  const params: any[] = [];
  const seen = new Set<string>();

  for (const [colName, value] of columnValues) {
    if (!colName || seen.has(colName)) continue;
    if (!hasColumn(tableName, colName)) continue;
    seen.add(colName);
    cols.push(`"${colName}"`);
    params.push(value);
    placeholders.push(`$${params.length}`);
  }

  if (options?.rawTimestampColumns) {
    for (const tsCol of options.rawTimestampColumns) {
      if (!seen.has(tsCol) && hasColumn(tableName, tsCol)) {
        seen.add(tsCol);
        cols.push(`"${tsCol}"`);
        placeholders.push('CURRENT_TIMESTAMP');
      }
    }
  }

  const conflictSql = options?.onConflict ? ` ${options.onConflict}` : '';
  const returningSql = options?.returning ? ` RETURNING ${options.returning}` : '';
  const sql = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})${conflictSql}${returningSql}`;
  return { sql, params };
}

export function buildCompatibleUpdate(
  tableName: string,
  setPairs: Array<[string | null | undefined, any]>,
  whereSqlWithParamOffset: (nextParamIndex: number) => { clause: string; params: any[] },
  options?: {
    rawSets?: Array<{ column: string; expr: string }>;
    returning?: string;
  }
): { sql: string; params: any[] } {
  const setClauses: string[] = [];
  const params: any[] = [];
  const seen = new Set<string>();

  for (const [colName, value] of setPairs) {
    if (!colName || seen.has(colName)) continue;
    if (!hasColumn(tableName, colName)) continue;
    seen.add(colName);
    params.push(value);
    setClauses.push(`"${colName}" = $${params.length}`);
  }

  if (options?.rawSets) {
    for (const raw of options.rawSets) {
      if (!seen.has(raw.column) && hasColumn(tableName, raw.column)) {
        seen.add(raw.column);
        setClauses.push(`"${raw.column}" = ${raw.expr}`);
      }
    }
  }

  if (setClauses.length === 0) {
    return { sql: 'SELECT 1 WHERE FALSE', params: [] };
  }

  const where = whereSqlWithParamOffset(params.length + 1);
  const allParams = [...params, ...where.params];
  const returningSql = options?.returning ? ` RETURNING ${options.returning}` : '';
  const sql = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE ${where.clause}${returningSql}`;
  return { sql, params: allParams };
}

export function toIntOrDefault(val: unknown, fallback: number = 0): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}

export function parseRuntimeToSeconds(runtimeStr: unknown): number {
  if (typeof runtimeStr !== 'string' || !runtimeStr.trim()) return 0;
  const parts = runtimeStr.trim().split(':').map(p => Number(p));
  if (parts.some(p => !Number.isFinite(p) || p < 0)) return 0;
  if (parts.length === 3) return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
  if (parts.length === 1) return Math.round(parts[0]);
  return 0;
}

export function formatDurationFromSeconds(totalSeconds: number): string {
  const safeSecs = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hrs = Math.floor(safeSecs / 3600);
  const mins = Math.floor((safeSecs % 3600) / 60);
  const secs = safeSecs % 60;
  return hrs > 0
    ? `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function buildEncryptedStreamKeyColumns(
  tableName: string,
  encrypted: { cipherText: string; iv: string; authTag: string },
  packedCipher: string
): Array<[string, string]> {
  const cols = schemaMeta.columnsByTable.get(tableName);
  if (!cols || cols.size === 0) {
    return [
      ['encrypted_key_cipher', encrypted.cipherText],
      ['encrypted_key_iv', encrypted.iv],
      ['encrypted_key_tag', encrypted.authTag]
    ];
  }

  const ivCandidates = ['encrypted_key_iv', 'stream_key_iv', 'encryption_iv', 'key_iv', 'iv'];
  const tagCandidates = [
    'encrypted_key_tag',
    'stream_key_tag',
    'stream_key_auth_tag',
    'encrypted_key_auth_tag',
    'auth_tag',
    'encryption_tag',
    'key_tag'
  ];
  const cipherCandidates = [
    'encrypted_key_cipher',
    'encrypted_stream_key',
    'stream_key_encrypted',
    'encrypted_key',
    'cipher_text'
  ];

  const ivCols = ivCandidates.filter(c => cols.has(c));
  const tagCols = tagCandidates.filter(c => cols.has(c));
  const hasSeparateIvAndTag = ivCols.length > 0 && tagCols.length > 0;
  const valueForCipherCol = hasSeparateIvAndTag ? encrypted.cipherText : packedCipher;

  const pairs: Array<[string, string]> = [];
  for (const col of cipherCandidates) {
    if (cols.has(col)) {
      pairs.push([col, valueForCipherCol]);
    }
  }
  for (const col of ivCols) {
    pairs.push([col, encrypted.iv]);
  }
  for (const col of tagCols) {
    pairs.push([col, encrypted.authTag]);
  }
  return pairs;
}
