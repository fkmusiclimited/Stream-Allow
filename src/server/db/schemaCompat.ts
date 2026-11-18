import crypto from 'crypto';

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
  columnDefault?: string | null;
  hasDefault?: boolean;
  isIdentity?: boolean;
  maxLength?: number | null;
}

export interface DbSchemaMeta {
  initialized: boolean;
  tables: Set<string>;
  columnsByTable: Map<string, Map<string, ColumnMeta>>;
  enumsByType: Map<string, string[]>;
  checkValuesByTableCol: Map<string, string[]>;
  streamTableName: 'streams' | 'live_streams';
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const schemaMeta: DbSchemaMeta = {
  initialized: false,
  tables: new Set<string>(),
  columnsByTable: new Map<string, Map<string, ColumnMeta>>(),
  enumsByType: new Map<string, string[]>(),
  checkValuesByTableCol: new Map<string, string[]>(),
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

export function isIntegerColumn(tableName: string, columnName: string): boolean {
  const meta = getColumnMeta(tableName, columnName);
  if (!meta) return false;
  return (
    meta.udtName === 'int2' ||
    meta.udtName === 'int4' ||
    meta.udtName === 'int8' ||
    meta.dataType === 'smallint' ||
    meta.dataType === 'integer' ||
    meta.dataType === 'bigint'
  );
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

function extractCheckConstraintValues(
  definition: string,
  tableCols: Map<string, ColumnMeta> | undefined
): Array<{ column: string; values: string[] }> {
  if (!definition || !tableCols || tableCols.size === 0) return [];
  if (/[<>!~]|LIKE\b|ILIKE\b|LENGTH\s*\(|CHAR_LENGTH\s*\(/i.test(definition)) {
    return [];
  }
  if (!/(?:=\s*ANY\s*\(|\bIN\s*\(|=\s*')/i.test(definition)) {
    return [];
  }

  const mentionedCols: string[] = [];
  for (const colName of tableCols.keys()) {
    const colPattern = new RegExp(`(?<![a-zA-Z0-9_])${colName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-zA-Z0-9_])`, 'i');
    if (colPattern.test(definition)) {
      mentionedCols.push(colName);
    }
  }

  if (mentionedCols.length !== 1) return [];

  const values: string[] = [];
  const literalRegex = /'([^']*)'/g;
  let match: RegExpExecArray | null;
  while ((match = literalRegex.exec(definition)) !== null) {
    if (match[1] !== '') {
      values.push(match[1]);
    }
  }

  if (values.length === 0) return [];
  return [{ column: mentionedCols[0], values: Array.from(new Set(values)) }];
}

export async function introspectDatabaseSchema(runQuery: QueryExecutor): Promise<DbSchemaMeta> {
  const nextTables = new Set<string>();
  const nextColumns = new Map<string, Map<string, ColumnMeta>>();
  const nextEnums = new Map<string, string[]>();
  const nextCheckValues = new Map<string, string[]>();

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
      column_default: string | null;
      is_identity?: string;
      character_maximum_length?: number | null;
    }>(
      `SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default, is_identity, character_maximum_length
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
      const hasDefault = row.column_default !== null && row.column_default !== undefined && String(row.column_default).trim() !== '';
      tableCols.set(row.column_name, {
        dataType: row.data_type,
        udtName: row.udt_name,
        isNullable: row.is_nullable === 'YES',
        columnDefault: row.column_default ?? null,
        hasDefault,
        isIdentity: row.is_identity === 'YES',
        maxLength: row.character_maximum_length != null ? Number(row.character_maximum_length) : null
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

    try {
      const checksRes = await runQuery<{ table_name: string; definition: string }>(
        `SELECT cls.relname AS table_name, pg_get_constraintdef(c.oid) AS definition
         FROM pg_constraint c
         JOIN pg_class cls ON cls.oid = c.conrelid
         JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
         WHERE nsp.nspname = 'public' AND c.contype = 'c'`
      );
      for (const row of checksRes.rows) {
        const extracted = extractCheckConstraintValues(row.definition, nextColumns.get(row.table_name));
        for (const item of extracted) {
          const key = `${row.table_name}.${item.column}`;
          const existing = nextCheckValues.get(key) || [];
          const merged = existing.length === 0
            ? item.values
            : existing.filter(v => item.values.includes(v));
          nextCheckValues.set(key, merged.length > 0 ? merged : item.values);
        }
      }
    } catch {
      // Non-fatal if pg_constraint catalog is unavailable
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
    schemaMeta.checkValuesByTableCol = nextCheckValues;
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

function getAllowedValuesForColumn(tableName: string, columnName: string): string[] | undefined {
  const colMeta = getColumnMeta(tableName, columnName);
  const enumLabels = colMeta ? schemaMeta.enumsByType.get(colMeta.udtName) : undefined;
  if (enumLabels && enumLabels.length > 0) {
    return enumLabels;
  }
  const checkLabels = schemaMeta.checkValuesByTableCol.get(`${tableName}.${columnName}`);
  if (checkLabels && checkLabels.length > 0) {
    return checkLabels;
  }
  return undefined;
}

export function resolveUserRoleForDb(canonicalRole: string = 'user'): string {
  const allowed = getAllowedValuesForColumn('users', 'role');
  if (!allowed || allowed.length === 0) {
    return canonicalRole;
  }
  return (
    matchEnumLabel(allowed, [
      canonicalRole,
      'user',
      'creator',
      'member',
      'customer',
      'client',
      'subscriber',
      'standard'
    ]) || canonicalRole
  );
}

export function resolveUserStatusForDb(
  canonicalStatus: 'Active' | 'Inactive' | 'Suspended' | 'Pending' = 'Inactive'
): string {
  const colMeta = getColumnMeta('users', 'status');
  if (colMeta && (colMeta.udtName === 'bool' || colMeta.dataType === 'boolean')) {
    return canonicalStatus === 'Active' ? 'true' : 'false';
  }
  const allowed = getAllowedValuesForColumn('users', 'status');
  if (!allowed || allowed.length === 0) {
    return canonicalStatus;
  }
  const prefMap: Record<'Active' | 'Inactive' | 'Suspended' | 'Pending', string[]> = {
    Inactive: ['Inactive', 'inactive', 'Pending', 'pending', 'Unpaid', 'unpaid', 'Disabled', 'disabled', 'Suspended', 'suspended', 'Active', 'active'],
    Active: ['Active', 'active', 'Enabled', 'enabled', 'Verified', 'verified'],
    Pending: ['Pending', 'pending', 'Inactive', 'inactive', 'Unpaid', 'unpaid'],
    Suspended: ['Suspended', 'suspended', 'Blocked', 'blocked', 'Inactive', 'inactive', 'Disabled', 'disabled']
  };
  return matchEnumLabel(allowed, prefMap[canonicalStatus]) || canonicalStatus;
}

export function normalizeUserStatusFromDb(
  rawStatus: unknown,
  fallback: 'Active' | 'Inactive' | 'Suspended' | 'Pending' = 'Inactive'
): 'Active' | 'Inactive' | 'Suspended' | 'Pending' {
  if (typeof rawStatus === 'boolean') {
    return rawStatus ? 'Active' : 'Inactive';
  }
  const s = String(rawStatus ?? '').trim().toLowerCase();
  if (!s) return fallback;
  if (s === 'active' || s === 'enabled' || s === 'verified' || s === 'true') return 'Active';
  if (s === 'suspended' || s === 'blocked' || s === 'banned') return 'Suspended';
  if (s === 'pending') return 'Pending';
  if (s === 'inactive' || s === 'unpaid' || s === 'disabled' || s === 'expired' || s === 'false') return 'Inactive';
  return fallback;
}

export function resolveUserPlanForDb(preferredPlan: string = 'Basic'): string {
  const allowed = getAllowedValuesForColumn('users', 'plan');
  const cleanPlan = ['Basic', 'Pro', 'Business'].includes(preferredPlan) ? preferredPlan : 'Basic';
  if (!allowed || allowed.length === 0) {
    return cleanPlan;
  }
  const prefMap: Record<string, string[]> = {
    Basic: ['Basic', 'basic', 'Free', 'free', 'Starter', 'starter', 'Standard', 'standard', 'Pro', 'pro'],
    Pro: ['Pro', 'pro', 'Plus', 'plus', 'Standard', 'standard', 'Basic', 'basic'],
    Business: ['Business', 'business', 'Enterprise', 'enterprise', 'Agency', 'agency', 'Premium', 'premium', 'Pro', 'pro']
  };
  return matchEnumLabel(allowed, prefMap[cleanPlan] || [cleanPlan]) || cleanPlan;
}

export function normalizeUserPlanFromDb(
  rawPlan: unknown,
  fallback: 'Basic' | 'Pro' | 'Business' = 'Basic'
): 'Basic' | 'Pro' | 'Business' {
  const s = String(rawPlan ?? '').trim().toLowerCase();
  if (!s) return fallback;
  if (s === 'business' || s === 'enterprise' || s === 'agency' || s === 'premium') return 'Business';
  if (s === 'pro' || s === 'plus' || s === 'standard') return 'Pro';
  if (s === 'basic' || s === 'free' || s === 'starter') return 'Basic';
  return fallback;
}

export function formatValueForColumnType(
  tableName: string,
  columnName: string,
  options: { date: Date; stringFallback: string }
): any {
  const meta = getColumnMeta(tableName, columnName);
  if (!meta) return options.stringFallback;
  if (meta.dataType === 'date' || meta.udtName === 'date') {
    return options.date.toISOString().slice(0, 10);
  }
  if (meta.dataType.includes('timestamp') || meta.udtName.includes('timestamp')) {
    return options.date.toISOString();
  }
  if (meta.udtName === 'bool' || meta.dataType === 'boolean') {
    return false;
  }
  if (meta.maxLength && meta.maxLength > 0 && options.stringFallback.length > meta.maxLength) {
    return options.stringFallback.slice(0, meta.maxLength);
  }
  return options.stringFallback;
}

export function getMissingRequiredColumnFallbacks(
  tableName: string,
  providedColumns: Iterable<string>,
  ctx: {
    userName: string;
    email: string;
    passwordHash: string;
    usernameCandidate: string;
    now: Date;
    resolvedPlan: string;
    resolvedStatus: string;
    resolvedRole: string;
  }
): Array<[string, any]> {
  const cols = schemaMeta.columnsByTable.get(tableName);
  if (!cols || cols.size === 0) return [];

  const provided = new Set(providedColumns);
  const fallbacks: Array<[string, any]> = [];

  for (const [colName, meta] of cols.entries()) {
    if (provided.has(colName)) continue;
    if (meta.isNullable || meta.hasDefault || meta.isIdentity) continue;
    if (colName === 'id') continue; // id is resolved explicitly before building insert

    const lower = colName.toLowerCase();
    let value: any;

    if (lower === 'name' || lower === 'full_name' || lower === 'display_name') {
      value = ctx.userName;
    } else if (lower === 'username' || lower === 'user_name' || lower === 'handle') {
      value = ctx.usernameCandidate;
    } else if (lower === 'email') {
      value = ctx.email;
    } else if (lower === 'password' || lower === 'password_hash' || lower === 'hashed_password' || lower === 'pass_hash') {
      value = ctx.passwordHash;
    } else if (lower === 'role') {
      value = ctx.resolvedRole;
    } else if (lower === 'plan') {
      value = ctx.resolvedPlan;
    } else if (lower === 'status') {
      value = ctx.resolvedStatus;
    } else if (lower === 'joined_date' || lower === 'subscription_start_date' || lower === 'expires_at' || lower === 'created_at' || lower === 'updated_at') {
      value = formatValueForColumnType(tableName, colName, {
        date: ctx.now,
        stringFallback: ctx.now.toISOString().slice(0, 10)
      });
    } else if (lower === 'renewal_date') {
      value = formatValueForColumnType(tableName, colName, {
        date: ctx.now,
        stringFallback: 'Unpaid'
      });
    } else if (lower === 'plan_duration_days' || lower === 'renewal_days_left') {
      value = 0;
    } else if (meta.udtName === 'bool' || meta.dataType === 'boolean') {
      value = false;
    } else if (
      meta.udtName === 'int2' ||
      meta.udtName === 'int4' ||
      meta.udtName === 'int8' ||
      meta.udtName === 'float4' ||
      meta.udtName === 'float8' ||
      meta.udtName === 'numeric' ||
      meta.dataType === 'integer' ||
      meta.dataType === 'bigint' ||
      meta.dataType === 'smallint' ||
      meta.dataType === 'numeric'
    ) {
      value = 0;
    } else if (meta.dataType === 'date' || meta.udtName === 'date') {
      value = ctx.now.toISOString().slice(0, 10);
    } else if (meta.dataType.includes('timestamp') || meta.udtName.includes('timestamp')) {
      value = ctx.now.toISOString();
    } else if (meta.udtName === 'uuid') {
      value = crypto.randomUUID();
    } else if (meta.udtName === 'json' || meta.udtName === 'jsonb') {
      value = '{}';
    } else {
      const enumLabels = schemaMeta.enumsByType.get(meta.udtName);
      if (enumLabels && enumLabels.length > 0) {
        value = enumLabels[0];
      } else {
        const checkLabels = schemaMeta.checkValuesByTableCol.get(`${tableName}.${colName}`);
        value = checkLabels && checkLabels.length > 0 ? checkLabels[0] : '';
      }
    }

    if (typeof value === 'string' && meta.maxLength && meta.maxLength > 0 && value.length > meta.maxLength) {
      value = value.slice(0, meta.maxLength);
    }

    fallbacks.push([colName, value]);
  }

  return fallbacks;
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
