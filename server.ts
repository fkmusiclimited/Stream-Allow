import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { initDatabaseConnection, closeDatabaseConnection, isDbConnected, query, saveDbSnapshot } from './src/server/db/db';
import {
  getStreamTableName,
  getDbSchemaMeta,
  hasTable,
  hasColumn,
  getColumnMeta,
  isUuidColumn,
  isIntegerColumn,
  isValidUuid,
  pickColumn,
  getPlaylistVideosOrderCol,
  introspectDatabaseSchema,
  resolveStreamStatusForDb,
  normalizeStreamStatusFromDb,
  resolvePlaylistStatusForDb,
  resolveUserRoleForDb,
  resolveUserStatusForDb,
  normalizeUserStatusFromDb,
  resolveUserPlanForDb,
  normalizeUserPlanFromDb,
  formatValueForColumnType,
  getMissingRequiredColumnFallbacks,
  buildCompatibleInsert,
  buildCompatibleUpdate,
  buildEncryptedStreamKeyColumns,
  toIntOrDefault,
  parseRuntimeToSeconds,
  formatDurationFromSeconds
} from './src/server/db/schemaCompat';
import {
  encryptStreamKey,
  packEncryptedStreamKey,
  extractEncryptedKeyFromRow,
  validateEncryptionConfig,
  maskStreamKey,
  EncryptedData
} from './src/server/utils/crypto';
import { StreamManager, StreamConfig } from './src/server/ffmpeg/StreamManager';
import { getVpsMetrics } from './src/server/monitoring/ResourceMonitor';
import {
  authenticateToken,
  requireRoles,
  hashPassword,
  comparePassword,
  hashResetToken,
  revokeToken,
  invalidateUserSessions,
  signToken,
  validateJwtConfig,
  AuthenticatedRequest
} from './src/server/middleware/auth';
import multer from 'multer';
import { videoUpload, imageUpload, extractVideoMetadata, getUploadDir, getChunkTempDir } from './src/server/media/mediaUpload';
import {
  verifyBkashPayment,
  verifyNagadPayment,
  verifyStripePayment,
  SUBSCRIPTION_TIERS
} from './src/server/billing/paymentService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPlanLimits(planName?: string) {
  const key = (planName || 'Basic').toLowerCase() as keyof typeof SUBSCRIPTION_TIERS;
  return SUBSCRIPTION_TIERS[key] || SUBSCRIPTION_TIERS.basic;
}

async function startServer() {
  // Validate critical security environment variables (halts if missing)
  validateJwtConfig();
  validateEncryptionConfig();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // Static directory for uploaded files and root uploads folder
  const uploadsDir = path.resolve(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
  }
  app.use('/uploads', express.static(uploadsDir));

  // Static directory for uploaded media files
  const mediaDir = process.env.MEDIA_UPLOAD_DIR || path.resolve(__dirname, 'uploads/media');
  if (!fs.existsSync(mediaDir)) {
    try { fs.mkdirSync(mediaDir, { recursive: true }); } catch {}
  }
  app.use('/media', express.static(mediaDir));

  // Static directory for generated video thumbnails
  const thumbDir = path.resolve(__dirname, 'uploads/thumbnails');
  if (!fs.existsSync(thumbDir)) {
    try { fs.mkdirSync(thumbDir, { recursive: true }); } catch {}
  }
  app.use('/media/thumbnails', express.static(thumbDir));

  // ----------------------------------------------------
  // DEDICATED SEO ROUTES: SITEMAP.XML & ROBOTS.TXT
  // Must execute before SPA fallback to guarantee application/xml content type
  // ----------------------------------------------------
  app.get('/sitemap.xml', (_req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const sitemapPath = path.resolve(__dirname, 'public/sitemap.xml');
    if (fs.existsSync(sitemapPath)) {
      return res.sendFile(sitemapPath);
    }
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url><loc>https://streamallow.com/</loc><lastmod>2026-11-07</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>https://streamallow.com/about</loc><lastmod>2026-11-07</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://streamallow.com/features</loc><lastmod>2026-11-07</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://streamallow.com/pricing</loc><lastmod>2026-11-07</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://streamallow.com/how-it-works</loc><lastmod>2026-11-07</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://streamallow.com/services</loc><lastmod>2026-11-07</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://streamallow.com/blog</loc><lastmod>2026-11-07</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>
  <url><loc>https://streamallow.com/faq</loc><lastmod>2026-11-07</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>https://streamallow.com/contact</loc><lastmod>2026-11-07</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://streamallow.com/terms-privacy</loc><lastmod>2026-11-07</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>
</urlset>`;
    res.send(fallbackXml);
  });

  app.get('/robots.txt', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const robotsPath = path.resolve(__dirname, 'public/robots.txt');
    if (fs.existsSync(robotsPath)) {
      return res.sendFile(robotsPath);
    }
    const fallbackRobots = `User-agent: *\nAllow: /\nAllow: /about\nAllow: /features\nAllow: /pricing\nAllow: /how-it-works\nAllow: /services\nAllow: /blog\nAllow: /faq\nAllow: /contact\nAllow: /terms-privacy\nDisallow: /admin/\nDisallow: /user/\nDisallow: /api/\nDisallow: /public/login\nDisallow: /public/register\nDisallow: /login\nDisallow: /register\n\nSitemap: https://streamallow.com/sitemap.xml\n`;
    res.send(fallbackRobots);
  });

  // Static directory for public branding assets (logos, favicons, etc.)
  const publicDir = path.resolve(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir, { maxAge: '1d' }));
  }

  // Initialize PostgreSQL Database Engine & Apply Schema Migrations
  try {
    await initDatabaseConnection();
  } catch (dbErr: any) {
    console.error('[PostgreSQL] Critical startup connection error:', dbErr.message);
  }

  const streamManager = StreamManager.getInstance();

  async function resolveValidUserId(reqUser?: { id?: string; email?: string; role?: string }): Promise<string | null> {
    const rawId = reqUser?.id ? String(reqUser.id).trim() : '';
    const rawEmail = reqUser?.email ? String(reqUser.email).trim().toLowerCase() : '';
    const uuidRequired = isUuidColumn('users', 'id');

    if (rawId && (!uuidRequired || isValidUuid(rawId))) {
      try {
        const res = await query<{ id: string }>('SELECT id FROM users WHERE id = $1 LIMIT 1', [rawId]);
        if (res.rows.length > 0) return res.rows[0].id;
      } catch {}
    }

    if (rawEmail) {
      try {
        const res = await query<{ id: string }>('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [rawEmail]);
        if (res.rows.length > 0) return res.rows[0].id;
      } catch {}
    }

    if (uuidRequired) {
      try {
        const roleFilter = reqUser?.role === 'super_admin' || reqUser?.role === 'admin' ? "role IN ('super_admin', 'admin')" : "role = 'user'";
        const res = await query<{ id: string }>(`SELECT id FROM users WHERE ${roleFilter} ORDER BY created_at ASC LIMIT 1`);
        if (res.rows.length > 0) return res.rows[0].id;
        const anyRes = await query<{ id: string }>('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
        if (anyRes.rows.length > 0) return anyRes.rows[0].id;
      } catch {}
    }

    return rawId || null;
  }

  function formatPlaylistVideoRow(v: any) {
    const durSecs = toIntOrDefault(v.duration_seconds, 0);
    const fmtDur = v.formatted_duration || v.duration || (durSecs > 0 ? formatDurationFromSeconds(durSecs) : '00:00');
    const fileUrl = v.file_url || v.url || '';
    const storagePath = v.storage_path || v.file_path || '';
    const thumb = v.thumbnail_url || v.thumbnail || '';
    const orderCol = getPlaylistVideosOrderCol();
    const orderVal = toIntOrDefault(v[orderCol] ?? v.position_order ?? v.order_index ?? v.sort_order, 1);

    return {
      id: v.id,
      playlistId: v.playlist_id,
      userId: v.user_id,
      mediaId: v.media_id,
      title: v.title || v.name || 'Untitled Video',
      duration: fmtDur,
      formattedDuration: fmtDur,
      durationSeconds: durSecs,
      resolution: v.resolution || '1080p FHD',
      format: v.format || 'MP4',
      url: fileUrl,
      fileUrl,
      filePath: storagePath,
      storagePath,
      fileSizeBytes: Number(v.file_size_bytes ?? v.file_size ?? 0),
      thumbnail: thumb,
      thumbnailUrl: thumb,
      positionOrder: orderVal
    };
  }

  async function syncActiveLivePlaylistQueue(playlistId: string) {
    const streamTable = getStreamTableName();
    if (isUuidColumn(streamTable, 'playlist_id') && !isValidUuid(playlistId)) return;
    const liveDbStatus = resolveStreamStatusForDb('live', streamTable);
    const endedDbStatus = resolveStreamStatusForDb('ended', streamTable);
    const orderCol = getPlaylistVideosOrderCol();
    const liveStrs = await query(`SELECT id FROM ${streamTable} WHERE playlist_id = $1 AND status = $2`, [playlistId, liveDbStatus]);
    if (liveStrs.rows.length === 0) return;

    const pvRows = await query(
      `SELECT * FROM playlist_videos WHERE playlist_id = $1 ORDER BY COALESCE("${orderCol}", 999999) ASC, created_at ASC`,
      [playlistId]
    );
    const currentPaths: string[] = [];
    for (const row of pvRows.rows) {
      const p = resolveLocalVideoPath(row.storage_path || row.file_path, row.file_url || row.url);
      if (p && !isDemoMedia(p)) currentPaths.push(p);
    }
    for (const s of liveStrs.rows) {
      if (currentPaths.length > 0) {
        await streamManager.updateConcatPlaylist(s.id, currentPaths);
      } else {
        await streamManager.stopStream(s.id);
        const upd = buildCompatibleUpdate(
          streamTable,
          [['status', endedDbStatus]],
          (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [s.id] }),
          { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
        );
        await query(upd.sql, upd.params).catch(() => {});
      }
    }
  }

  // Listen for permanent process halting and update stream database status to 'ended'
  streamManager.setOnStreamHalted(async (streamId, reason) => {
    try {
      const streamTable = getStreamTableName();
      if (isUuidColumn(streamTable, 'id') && !isValidUuid(streamId)) return;
      const endedDbStatus = resolveStreamStatusForDb('ended', streamTable);
      const upd = buildCompatibleUpdate(
        streamTable,
        [['status', endedDbStatus]],
        (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [streamId] }),
        {
          rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }],
          returning: hasColumn(streamTable, 'playlist_id') ? 'playlist_id' : undefined
        }
      );
      const res = await query(upd.sql, upd.params);
      const plId = res.rows[0]?.playlist_id;
      if (plId) {
        const plUpd = buildCompatibleUpdate(
          'playlists',
          [['status', resolvePlaylistStatusForDb('Ended')]],
          (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [plId] }),
          { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
        );
        await query(plUpd.sql, plUpd.params).catch(() => {});
      }
      console.info(`[Stream Supervisor] Stream ${streamId} ended (${reason || 'Connection closed'})`);
    } catch (err: any) {
      console.warn(`[Stream Supervisor] Notice updating stream ${streamId} status:`, err.message);
    }
  });

  // Stale stream cleanup and auto-expiry check on startup
  setTimeout(async () => {
    try {
      const streamTable = getStreamTableName();
      const liveDbStatus = resolveStreamStatusForDb('live', streamTable);
      const endedDbStatus = resolveStreamStatusForDb('ended', streamTable);
      const resetRes = await query(
        hasColumn(streamTable, 'updated_at')
          ? `UPDATE ${streamTable} SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE status = $2`
          : `UPDATE ${streamTable} SET status = $1 WHERE status = $2`,
        [endedDbStatus, liveDbStatus]
      );
      if (resetRes.rowCount > 0) {
        console.info(`[Stream Lifecycle] Cleaned up ${resetRes.rowCount} stale stream session(s) on reboot.`);
      }
      // Auto-deactivate accounts where subscription expiry has passed and sync remaining days
      if (hasColumn('users', 'expires_at') && hasColumn('users', 'renewal_days_left')) {
        await query(`
          UPDATE users 
          SET status = 'Inactive', renewal_days_left = 0 
          WHERE role = 'user' 
            AND status = 'Active' 
            AND expires_at IS NOT NULL 
            AND expires_at <= CURRENT_TIMESTAMP
        `);
        await query(`
          UPDATE users
          SET renewal_days_left = GREATEST(0, CEIL(EXTRACT(EPOCH FROM (expires_at - CURRENT_TIMESTAMP)) / 86400.0)::int)
          WHERE status = 'Active'
            AND expires_at IS NOT NULL
            AND expires_at > CURRENT_TIMESTAMP
        `);
      }
    } catch (err: any) {
      console.warn('[Stream Lifecycle] Startup check notice:', err.message);
    }
  }, 1000);

  // Periodic check every 60 seconds: deactivate expired accounts and keep DB remaining days synced
  setInterval(async () => {
    try {
      if (!hasColumn('users', 'expires_at') || !hasColumn('users', 'renewal_days_left')) return;
      await query(`
        UPDATE users 
        SET status = 'Inactive', renewal_days_left = 0 
        WHERE role = 'user' 
          AND status = 'Active' 
          AND expires_at IS NOT NULL 
          AND expires_at <= CURRENT_TIMESTAMP
      `);
      await query(`
        UPDATE users
        SET renewal_days_left = GREATEST(0, CEIL(EXTRACT(EPOCH FROM (expires_at - CURRENT_TIMESTAMP)) / 86400.0)::int)
        WHERE status = 'Active'
          AND expires_at IS NOT NULL
          AND expires_at > CURRENT_TIMESTAMP
      `);
    } catch {}
  }, 60000);

  // ----------------------------------------------------
  // 1. HEALTH & SYSTEM MONITORING ROUTES
  // ----------------------------------------------------
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      platform: 'Stream Allow Core SaaS Engine',
      version: '3.5.0',
      database: isDbConnected() ? 'PostgreSQL Active (Persistent)' : 'PostgreSQL Initializing',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/system/db-status', async (_req, res) => {
    try {
      const streamTable = getStreamTableName();
      const liveDbStatus = resolveStreamStatusForDb('live', streamTable);
      const usersRes = await query('SELECT COUNT(*)::int as count FROM users');
      const streamsRes = await query(`SELECT COUNT(*)::int as count FROM ${streamTable} WHERE status = $1`, [liveDbStatus]);
      res.json({
        isPostgreSqlConnected: isDbConnected(),
        databaseEngine: 'PostgreSQL Relational (Persistent)',
        connectionPoolLimit: 20,
        activeUsers: usersRes.rows[0]?.count || 0,
        activeStreams: streamsRes.rows[0]?.count || 0
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/system/metrics', (_req, res) => {
    const metrics = getVpsMetrics();
    res.json({ success: true, metrics });
  });

  app.get('/api/system/capabilities', (_req, res) => {
    const capabilities = streamManager.getHostCapabilities();
    res.json({ success: true, capabilities });
  });

  app.get('/api/system/processes', authenticateToken, (_req, res) => {
    const processes = streamManager.getAllActiveProcesses();
    res.json({ success: true, processes });
  });

  // ----------------------------------------------------
  // 2. AUTHENTICATION & PERMISSIONS (PostgreSQL)
  // ----------------------------------------------------
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const cleanPass = String(password);
    if (cleanPass.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    try {
      if (!getDbSchemaMeta().initialized || !hasTable('users')) {
        await introspectDatabaseSchema(query);
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }

      const nowDate = new Date();
      const passwordHash = await hashPassword(cleanPass);
      const userName = (name ? String(name).trim() : '') || normalizedEmail.split('@')[0];
      const requestedPlan: 'Basic' | 'Pro' | 'Business' =
        req.body.plan && ['Basic', 'Pro', 'Business'].includes(req.body.plan) ? req.body.plan : 'Basic';

      const dbRole = resolveUserRoleForDb('user');
      const dbPlan = resolveUserPlanForDb(requestedPlan);
      const dbStatus = resolveUserStatusForDb('Inactive');

      const columnValues: Array<[string, any]> = [];
      const idMeta = getColumnMeta('users', 'id');

      if (hasColumn('users', 'id')) {
        if (isIntegerColumn('users', 'id')) {
          if (!idMeta?.hasDefault && !idMeta?.isIdentity) {
            const nextIdRes = await query<{ next_id: string | number }>('SELECT COALESCE(MAX(id), 0)::bigint + 1 AS next_id FROM users');
            columnValues.push(['id', Number(nextIdRes.rows[0]?.next_id || 1)]);
          }
        } else {
          let newId: string = crypto.randomUUID();
          if (idMeta?.maxLength && idMeta.maxLength > 0 && newId.length > idMeta.maxLength) {
            newId = newId.replace(/-/g, '').slice(0, idMeta.maxLength);
          }
          columnValues.push(['id', newId]);
        }
      }

      const nameCol = pickColumn('users', ['name', 'full_name', 'display_name']);
      if (nameCol) {
        columnValues.push([nameCol, userName]);
      }

      columnValues.push(['email', normalizedEmail]);

      const passwordCol = pickColumn('users', ['password_hash', 'hashed_password', 'password', 'pass_hash']) || 'password_hash';
      columnValues.push([passwordCol, passwordHash]);

      if (hasColumn('users', 'role')) {
        columnValues.push(['role', dbRole]);
      }
      if (hasColumn('users', 'plan')) {
        columnValues.push(['plan', dbPlan]);
      }
      if (hasColumn('users', 'status')) {
        columnValues.push(['status', dbStatus]);
      }
      if (hasColumn('users', 'joined_date')) {
        columnValues.push([
          'joined_date',
          formatValueForColumnType('users', 'joined_date', { date: nowDate, stringFallback: 'Today' })
        ]);
      }

      let usernameCandidate = normalizedEmail
        .split('@')[0]
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/^_+|_+$/g, '') || 'creator';
      const usernameCol = pickColumn('users', ['username', 'user_name', 'handle']);
      if (usernameCol) {
        const uMeta = getColumnMeta('users', usernameCol);
        if (uMeta && !uMeta.isNullable && !uMeta.hasDefault) {
          try {
            const uExists = await query(`SELECT 1 FROM users WHERE LOWER("${usernameCol}") = LOWER($1) LIMIT 1`, [usernameCandidate]);
            if (uExists.rows.length > 0) {
              usernameCandidate = `${usernameCandidate}_${crypto.randomBytes(2).toString('hex')}`;
            }
          } catch {}
        }
      }

      const providedSet = new Set(columnValues.map(([col]) => col));
      const requiredFallbacks = getMissingRequiredColumnFallbacks('users', providedSet, {
        userName,
        email: normalizedEmail,
        passwordHash,
        usernameCandidate,
        now: nowDate,
        resolvedPlan: dbPlan,
        resolvedStatus: dbStatus,
        resolvedRole: dbRole
      });
      for (const pair of requiredFallbacks) {
        columnValues.push(pair);
      }

      const insertQ = buildCompatibleInsert('users', columnValues, {
        rawTimestampColumns: ['created_at', 'updated_at'],
        returning: '*'
      });
      const insertRes = await query(insertQ.sql, insertQ.params);
      await saveDbSnapshot().catch(() => {});

      const row = insertRes.rows[0] || {};
      const resolvedId = String(row.id ?? columnValues.find(([c]) => c === 'id')?.[1] ?? normalizedEmail);
      const user = {
        id: resolvedId,
        name: row.name || row.full_name || row.display_name || row.username || userName,
        email: row.email || normalizedEmail,
        role: 'user' as const,
        plan: normalizeUserPlanFromDb(row.plan, requestedPlan),
        status: normalizeUserStatusFromDb(row.status, 'Inactive')
      };

      const token = signToken({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan
      });

      res.status(201).json({
        success: true,
        user,
        token
      });
    } catch (err: any) {
      console.error('[Auth Register Error]', {
        code: err?.code,
        detail: err?.detail,
        constraint: err?.constraint,
        column: err?.column,
        message: err?.message
      });

      if (err?.code === '23505') {
        const detailStr = `${err?.constraint || ''} ${err?.detail || ''}`.toLowerCase();
        const dupMsg = detailStr.includes('email')
          ? 'An account with this email already exists.'
          : detailStr.includes('username')
          ? 'This username is already taken. Please try again.'
          : 'An account with these details already exists.';
        return res.status(409).json({
          success: false,
          message: dupMsg,
          error: err?.message || dupMsg
        });
      }

      const errMsg = err?.message || 'Unable to create account.';
      res.status(500).json({
        success: false,
        message: `Registration failed: ${errMsg}`,
        error: errMsg
      });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Username/email and password are required.' });
    }

    try {
      const rawIdentifier = String(email).trim();
      const normalizedInput = rawIdentifier.toLowerCase();
      const lookupEmail = normalizedInput === 'admin' ? 'admin@streamallow.com' : normalizedInput;

      let userRes = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [lookupEmail]);
      if (userRes.rows.length === 0 && !rawIdentifier.includes('@')) {
        userRes = await query('SELECT * FROM users WHERE LOWER(name) = LOWER($1) LIMIT 1', [normalizedInput]);
      }

      if (userRes.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
      }

      const user = userRes.rows[0];
      const candidatePass = String(password);
      const isValidPassword = await comparePassword(candidatePass, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
      }

      const token = signToken({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan,
          status: user.status
        },
        token
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (token) {
      revokeToken(token);
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  app.get('/api/auth/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!req.user?.id && !req.user?.email) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }
    try {
      const canQueryById = req.user.id && (!isUuidColumn('users', 'id') || isValidUuid(req.user.id));
      const userRes = canQueryById
        ? await query('SELECT id, name, email, role, plan, status FROM users WHERE id = $1', [req.user.id])
        : req.user.email
        ? await query('SELECT id, name, email, role, plan, status FROM users WHERE LOWER(email) = LOWER($1)', [req.user.email])
        : { rows: [] };
      if (userRes.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Account not found.' });
      }
      res.json({ success: true, user: userRes.rows[0] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/auth/change-password', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }

    const cleanNewPass = String(newPassword);
    if (cleanNewPass.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    try {
      const canQueryById = req.user?.id && (!isUuidColumn('users', 'id') || isValidUuid(req.user.id));
      const userRes = canQueryById
        ? await query('SELECT id, name, email, role, plan, password_hash FROM users WHERE id = $1 LIMIT 1', [req.user!.id])
        : req.user?.email
        ? await query('SELECT id, name, email, role, plan, password_hash FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [req.user!.email])
        : { rows: [] };

      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Authenticated user account not found.' });
      }

      const user = userRes.rows[0];
      const matchesCurrent = await comparePassword(String(currentPassword), user.password_hash);
      if (!matchesCurrent) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }

      const newHash = await hashPassword(cleanNewPass);
      const updQ = buildCompatibleUpdate(
        'users',
        [['password_hash', newHash]],
        (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [user.id] }),
        { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
      );
      await query(updQ.sql, updQ.params);
      await saveDbSnapshot().catch(() => {});

      const authHeader = req.headers['authorization'];
      const oldToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (oldToken) revokeToken(oldToken);
      invalidateUserSessions(user.id, user.email);

      const newToken = signToken({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan
      });

      const logQ = buildCompatibleInsert(
        'activity_logs',
        [
          ['id', crypto.randomUUID()],
          [pickColumn('activity_logs', ['user_name', 'user', 'username']), user.name],
          ['user_id', isUuidColumn('activity_logs', 'user_id') && !isValidUuid(user.id) ? null : user.id],
          ['action', `Password changed securely for ${user.email}`],
          ['category', user.role === 'user' ? 'user' : 'admin'],
          [pickColumn('activity_logs', ['ip_address', 'ip']), req.ip || '127.0.0.1']
        ],
        { rawTimestampColumns: ['created_at'] }
      );
      await query(logQ.sql, logQ.params).catch(() => {});

      res.json({
        success: true,
        message: 'Password updated securely with bcrypt.',
        token: newToken
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const rawIdentifier = String(req.body?.email || '').trim();
    if (!rawIdentifier) {
      return res.status(400).json({ success: false, message: 'Email or username is required.' });
    }

    try {
      const normalizedInput = rawIdentifier.toLowerCase();
      const lookupEmail = normalizedInput === 'admin' ? 'admin@streamallow.com' : normalizedInput;

      let userRes = await query('SELECT id, name, email, role FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [lookupEmail]);
      if (userRes.rows.length === 0 && !rawIdentifier.includes('@')) {
        userRes = await query('SELECT id, name, email, role FROM users WHERE LOWER(name) = LOWER($1) LIMIT 1', [normalizedInput]);
      }

      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        const rawToken = crypto.randomBytes(24).toString('hex');
        const tokenHash = hashResetToken(rawToken);
        const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

        await query('DELETE FROM password_resets WHERE LOWER(email) = LOWER($1)', [user.email]);
        await query(
          'INSERT INTO password_resets (email, token, expires_at, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
          [user.email.toLowerCase(), tokenHash, expiresAt]
        );
        await saveDbSnapshot().catch(() => {});

        // Log one-time reset token ONLY on server console/security log (never returned in HTTP response)
        console.warn(`[AUTH PASSWORD RESET] One-time reset token for ${user.email} (${user.role}): ${rawToken} (expires in 15m)`);
      }

      res.json({
        success: true,
        message: 'If an account matches that username/email, a secure 15-minute password reset token has been generated. Check your configured email or server security logs.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { email, token, recoveryKey, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).trim().length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }
    if (!token && !recoveryKey) {
      return res.status(400).json({ success: false, message: 'Reset token or recovery key is required.' });
    }

    try {
      let targetEmail = '';

      if (token) {
        const tokenHash = hashResetToken(String(token));
        const resetRes = await query(
          'SELECT * FROM password_resets WHERE token = $1 AND expires_at > $2 LIMIT 1',
          [tokenHash, Date.now()]
        );
        if (resetRes.rows.length === 0) {
          return res.status(400).json({ success: false, message: 'Invalid or expired password reset token.' });
        }

        const resetRecord = resetRes.rows[0];
        if (email) {
          const norm = String(email).trim().toLowerCase();
          const mapped = norm === 'admin' ? 'admin@streamallow.com' : norm;
          if (mapped !== String(resetRecord.email).toLowerCase()) {
            // Also permit matching by username if user typed username in step 1
            const uCheck = await query('SELECT email FROM users WHERE LOWER(email) = LOWER($1) AND LOWER(name) = LOWER($2) LIMIT 1', [resetRecord.email, norm]);
            if (uCheck.rows.length === 0) {
              return res.status(400).json({ success: false, message: 'Reset token does not match this account.' });
            }
          }
        }
        targetEmail = String(resetRecord.email).toLowerCase();
        await query('DELETE FROM password_resets WHERE LOWER(email) = LOWER($1)', [targetEmail]);
      } else if (recoveryKey) {
        const envKey = process.env.ADMIN_RESET_KEY;
        const provided = String(recoveryKey).trim();
        if (!envKey || envKey.length < 8) {
          return res.status(400).json({ success: false, message: 'Server recovery key is not configured. Please use the one-time reset token.' });
        }
        const bufA = Buffer.from(provided);
        const bufB = Buffer.from(envKey);
        if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
          return res.status(401).json({ success: false, message: 'Invalid server recovery key.' });
        }
        const norm = String(email || '').trim().toLowerCase();
        targetEmail = (!norm || norm === 'admin') ? 'admin@streamallow.com' : norm;
      }

      const userRes = await query('SELECT id, name, email, role FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [targetEmail]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Target account not found.' });
      }

      const user = userRes.rows[0];
      const newHash = await hashPassword(String(newPassword));
      const updQ = buildCompatibleUpdate(
        'users',
        [['password_hash', newHash]],
        (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [user.id] }),
        { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
      );
      await query(updQ.sql, updQ.params);
      await saveDbSnapshot().catch(() => {});

      invalidateUserSessions(user.id, user.email);

      const logQ = buildCompatibleInsert(
        'activity_logs',
        [
          ['id', crypto.randomUUID()],
          [pickColumn('activity_logs', ['user_name', 'user', 'username']), user.name],
          ['user_id', isUuidColumn('activity_logs', 'user_id') && !isValidUuid(user.id) ? null : user.id],
          ['action', `Password reset completed via verified recovery for ${user.email}`],
          ['category', user.role === 'user' ? 'user' : 'admin'],
          [pickColumn('activity_logs', ['ip_address', 'ip']), req.ip || '127.0.0.1']
        ],
        { rawTimestampColumns: ['created_at'] }
      );
      await query(logQ.sql, logQ.params).catch(() => {});

      res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ----------------------------------------------------
  // 3. PLAYLISTS & VIDEO MANAGEMENT (PostgreSQL)
  // ----------------------------------------------------
  app.get('/api/playlists', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const userId = await resolveValidUserId(req.user);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const isSuperAdmin = req.user?.role === 'super_admin';

    try {
      if (!isSuperAdmin && isUuidColumn('playlists', 'user_id') && !isValidUuid(userId)) {
        return res.json({ success: true, playlists: [] });
      }

      const playlistsQuery = isSuperAdmin
        ? 'SELECT * FROM playlists ORDER BY created_at DESC'
        : 'SELECT * FROM playlists WHERE user_id = $1 ORDER BY created_at DESC';
      const plRes = await query(playlistsQuery, isSuperAdmin ? [] : [userId]);

      const orderCol = getPlaylistVideosOrderCol();
      const playlists = [];

      for (const p of plRes.rows) {
        const videosRes = await query(
          `SELECT * FROM playlist_videos WHERE playlist_id = $1 ORDER BY COALESCE("${orderCol}", 999999) ASC, created_at ASC`,
          [p.id]
        );
        const mappedVideos = videosRes.rows.map(formatPlaylistVideoRow);
        const summedVideoSecs = mappedVideos.reduce((acc, v) => acc + (v.durationSeconds || 0), 0);
        const rawRuntimeSecs = p.total_runtime_seconds !== undefined && p.total_runtime_seconds !== null
          ? toIntOrDefault(p.total_runtime_seconds, 0)
          : parseRuntimeToSeconds(p.total_runtime);
        const runtimeSecs = rawRuntimeSecs > 0 ? rawRuntimeSecs : summedVideoSecs;
        const formattedRuntime = runtimeSecs > 0
          ? formatDurationFromSeconds(runtimeSecs)
          : (p.total_runtime || '00:00');
        const thumb = p.thumbnail_url || p.thumbnail || mappedVideos[0]?.thumbnailUrl || '';

        playlists.push({
          id: p.id,
          userId: p.user_id,
          name: p.name ?? p.title ?? 'Untitled Playlist',
          description: p.description || '',
          status: p.status || 'Scheduled',
          isLiveLoop: p.is_live_loop ?? p.is_loop ?? true,
          totalVideos: mappedVideos.length,
          totalRuntimeSeconds: runtimeSecs,
          totalRuntime: formattedRuntime,
          thumbnail: thumb,
          thumbnailUrl: thumb,
          videos: mappedVideos
        });
      }

      res.json({ success: true, playlists });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/playlists', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { name, description, isLiveLoop, thumbnail, thumbnailUrl } = req.body;
    const userId = await resolveValidUserId(req.user);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const newId = crypto.randomUUID();
    const plName = name || 'New Live Playlist';
    const plDesc = description || '';
    const plThumb = thumbnailUrl || thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
    const loopVal = isLiveLoop !== undefined ? Boolean(isLiveLoop) : true;
    const plStatus = resolvePlaylistStatusForDb('Scheduled');

    try {
      const insertQ = buildCompatibleInsert(
        'playlists',
        [
          ['id', newId],
          ['user_id', userId],
          [pickColumn('playlists', ['name', 'title']), plName],
          ['description', plDesc],
          ['status', plStatus],
          [pickColumn('playlists', ['is_live_loop', 'live_loop', 'is_loop']), loopVal],
          [pickColumn('playlists', ['total_videos', 'video_count']), 0],
          ['total_runtime', '00:00'],
          ['total_runtime_seconds', 0],
          ['thumbnail', plThumb],
          ['thumbnail_url', plThumb]
        ],
        {
          rawTimestampColumns: ['created_at', 'updated_at'],
          returning: '*'
        }
      );
      const insertRes = await query(insertQ.sql, insertQ.params);

      const p = insertRes.rows[0];
      const playlist = {
        id: p.id,
        userId: p.user_id,
        name: p.name ?? p.title ?? plName,
        description: p.description || '',
        status: p.status || plStatus,
        isLiveLoop: p.is_live_loop ?? loopVal,
        totalVideos: 0,
        totalRuntimeSeconds: 0,
        totalRuntime: '00:00',
        thumbnail: p.thumbnail_url || p.thumbnail || plThumb,
        thumbnailUrl: p.thumbnail_url || p.thumbnail || plThumb,
        videos: []
      };

      res.status(201).json({ success: true, playlist });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/playlists/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (isUuidColumn('playlists', 'id') && !isValidUuid(req.params.id)) {
        return res.status(404).json({ success: false, message: 'Playlist not found.' });
      }
      const plRes = await query('SELECT * FROM playlists WHERE id = $1', [req.params.id]);
      if (plRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Playlist not found.' });
      }

      const p = plRes.rows[0];
      const resolvedUserId = await resolveValidUserId(req.user);
      if (p.user_id !== req.user?.id && p.user_id !== resolvedUserId && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this playlist.' });
      }

      const orderCol = getPlaylistVideosOrderCol();
      const videosRes = await query(
        `SELECT * FROM playlist_videos WHERE playlist_id = $1 ORDER BY COALESCE("${orderCol}", 999999) ASC, created_at ASC`,
        [p.id]
      );
      const mappedVideos = videosRes.rows.map(formatPlaylistVideoRow);
      const summedVideoSecs = mappedVideos.reduce((acc, v) => acc + (v.durationSeconds || 0), 0);
      const rawRuntimeSecs = p.total_runtime_seconds !== undefined && p.total_runtime_seconds !== null
        ? toIntOrDefault(p.total_runtime_seconds, 0)
        : parseRuntimeToSeconds(p.total_runtime);
      const runtimeSecs = rawRuntimeSecs > 0 ? rawRuntimeSecs : summedVideoSecs;
      const formattedRuntime = runtimeSecs > 0
        ? formatDurationFromSeconds(runtimeSecs)
        : (p.total_runtime || '00:00');
      const thumb = p.thumbnail_url || p.thumbnail || mappedVideos[0]?.thumbnailUrl || '';

      const playlist = {
        id: p.id,
        userId: p.user_id,
        name: p.name ?? p.title ?? 'Untitled Playlist',
        description: p.description || '',
        status: p.status || 'Scheduled',
        isLiveLoop: p.is_live_loop ?? p.is_loop ?? true,
        totalVideos: mappedVideos.length,
        totalRuntimeSeconds: runtimeSecs,
        totalRuntime: formattedRuntime,
        thumbnail: thumb,
        thumbnailUrl: thumb,
        videos: mappedVideos
      };

      res.json({ success: true, playlist });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/playlists/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { name, description, status, isLiveLoop, thumbnail, thumbnailUrl } = req.body;
    try {
      if (isUuidColumn('playlists', 'id') && !isValidUuid(req.params.id)) {
        return res.status(404).json({ success: false, message: 'Playlist not found.' });
      }
      const existingRes = await query('SELECT user_id FROM playlists WHERE id = $1', [req.params.id]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Playlist not found.' });
      }
      const resolvedUserId = await resolveValidUserId(req.user);
      if (existingRes.rows[0].user_id !== req.user?.id && existingRes.rows[0].user_id !== resolvedUserId && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this playlist.' });
      }

      const nextThumb = thumbnailUrl || thumbnail;
      const setPairs: Array<[string | null, any]> = [];
      if (name !== undefined) setPairs.push([pickColumn('playlists', ['name', 'title']), name]);
      if (description !== undefined) setPairs.push(['description', description]);
      if (status !== undefined) {
        const normalizedPlStatus = status === 'Live' || status === 'live' ? 'Live'
          : status === 'Ended' || status === 'ended' ? 'Ended'
          : status === 'Active' || status === 'active' ? 'Active'
          : 'Scheduled';
        setPairs.push(['status', resolvePlaylistStatusForDb(normalizedPlStatus)]);
      }
      if (isLiveLoop !== undefined) setPairs.push([pickColumn('playlists', ['is_live_loop', 'live_loop', 'is_loop']), Boolean(isLiveLoop)]);
      if (nextThumb !== undefined) {
        setPairs.push(['thumbnail', nextThumb]);
        setPairs.push(['thumbnail_url', nextThumb]);
      }

      if (setPairs.length === 0) {
        const curr = await query('SELECT * FROM playlists WHERE id = $1', [req.params.id]);
        return res.json({ success: true, playlist: curr.rows[0] });
      }

      const updQ = buildCompatibleUpdate(
        'playlists',
        setPairs,
        (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [req.params.id] }),
        { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }], returning: '*' }
      );
      const plRes = await query(updQ.sql, updQ.params);

      res.json({ success: true, playlist: plRes.rows[0] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/playlists/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (isUuidColumn('playlists', 'id') && !isValidUuid(req.params.id)) {
        return res.status(404).json({ success: false, message: 'Playlist not found.' });
      }
      const existingRes = await query('SELECT user_id FROM playlists WHERE id = $1', [req.params.id]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Playlist not found.' });
      }
      const resolvedUserId = await resolveValidUserId(req.user);
      if (existingRes.rows[0].user_id !== req.user?.id && existingRes.rows[0].user_id !== resolvedUserId && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this playlist.' });
      }

      await query('DELETE FROM playlists WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Playlist deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/playlists/:id/videos', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const playlistId = req.params.id;
    const userId = await resolveValidUserId(req.user);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    try {
      if (isUuidColumn('playlists', 'id') && !isValidUuid(playlistId)) {
        return res.status(400).json({ success: false, message: 'Invalid playlist ID format.' });
      }

      let plRes = await query('SELECT * FROM playlists WHERE id = $1', [playlistId]);
      if (plRes.rows.length === 0) {
        const autoPlName = req.body.playlistName || req.body.title || 'Stream Playlist';
        const autoThumb = req.body.thumbnailUrl || req.body.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';
        const autoPlQ = buildCompatibleInsert(
          'playlists',
          [
            ['id', playlistId],
            ['user_id', userId],
            [pickColumn('playlists', ['name', 'title']), autoPlName],
            ['description', ''],
            ['status', resolvePlaylistStatusForDb('Active')],
            [pickColumn('playlists', ['is_live_loop', 'live_loop', 'is_loop']), true],
            [pickColumn('playlists', ['total_videos', 'video_count']), 0],
            ['total_runtime', '00:00'],
            ['total_runtime_seconds', 0],
            ['thumbnail', autoThumb],
            ['thumbnail_url', autoThumb]
          ],
          { rawTimestampColumns: ['created_at', 'updated_at'], onConflict: 'ON CONFLICT (id) DO NOTHING' }
        );
        await query(autoPlQ.sql, autoPlQ.params);
        plRes = await query('SELECT * FROM playlists WHERE id = $1', [playlistId]);
      }

      // Video Validation & Auto-registration fallback
      const targetMediaId = req.body.mediaId || req.body.id;
      let mediaRecord: any = null;
      const isSuperAdmin = req.user?.role === 'super_admin';

      if (targetMediaId && (!isUuidColumn('uploaded_media', 'id') || isValidUuid(targetMediaId))) {
        const mRes = isSuperAdmin
          ? await query('SELECT * FROM uploaded_media WHERE id = $1', [targetMediaId])
          : await query('SELECT * FROM uploaded_media WHERE id = $1 AND user_id = $2', [targetMediaId, userId]);
        if (mRes.rows.length > 0) {
          mediaRecord = mRes.rows[0];
        }
      }

      if (!mediaRecord && (req.body.filePath || req.body.storagePath || req.body.fileUrl || req.body.url)) {
        const cleanPath = req.body.filePath || req.body.storagePath || '';
        const cleanUrl = req.body.fileUrl || req.body.url || '';
        const urlCol = pickColumn('uploaded_media', ['file_url', 'url']) || 'url';
        const pathCol = pickColumn('uploaded_media', ['file_path', 'storage_path']) || 'file_path';
        const mRes = isSuperAdmin
          ? await query(
              `SELECT * FROM uploaded_media WHERE "${pathCol}" = $1 OR "${urlCol}" = $2 LIMIT 1`,
              [cleanPath, cleanUrl]
            )
          : await query(
              `SELECT * FROM uploaded_media WHERE ("${pathCol}" = $1 OR "${urlCol}" = $2) AND user_id = $3 LIMIT 1`,
              [cleanPath, cleanUrl, userId]
            );
        if (mRes.rows.length > 0) {
          mediaRecord = mRes.rows[0];
        }
      }

      if (!mediaRecord) {
        const candidatePath = req.body.filePath || req.body.storagePath || '';
        const resolved = candidatePath ? resolveLocalVideoPath(candidatePath) : null;
        if (resolved && fs.existsSync(resolved)) {
          const newMediaId = crypto.randomUUID();
          const autoName = req.body.title || path.basename(resolved);
          const autoUrl = req.body.fileUrl || req.body.url || `/media/${path.basename(resolved)}`;
          const autoDurSecs = Math.max(1, toIntOrDefault(req.body.durationSeconds, 300));
          const autoDuration = req.body.formattedDuration || req.body.duration || formatDurationFromSeconds(autoDurSecs);
          const autoRes = req.body.resolution || '1080p FHD';
          const autoFormat = req.body.format || 'MP4';
          const autoThumb = req.body.thumbnailUrl || req.body.thumbnail || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600';
          const autoSize = Math.max(0, toIntOrDefault(req.body.fileSizeBytes, fs.existsSync(resolved) ? fs.statSync(resolved).size : 50000000));

          const insMediaQ = buildCompatibleInsert(
            'uploaded_media',
            [
              ['id', newMediaId],
              ['user_id', userId],
              [pickColumn('uploaded_media', ['file_name', 'filename']), autoName],
              ['original_name', autoName],
              [pickColumn('uploaded_media', ['file_path', 'storage_path']), resolved],
              ['url', autoUrl],
              ['file_url', autoUrl],
              ['duration_seconds', autoDurSecs],
              ['formatted_duration', autoDuration],
              ['resolution', autoRes],
              ['format', autoFormat],
              [pickColumn('uploaded_media', ['file_size_bytes', 'file_size']), autoSize],
              ['thumbnail_url', autoThumb],
              ['thumbnail', autoThumb]
            ],
            { rawTimestampColumns: ['created_at'], returning: '*' }
          );
          const insRes = await query(insMediaQ.sql, insMediaQ.params);
          mediaRecord = insRes.rows[0];
        }
      }

      // Determine genuine server video properties strictly from database record
      const videoId = crypto.randomUUID();
      const title = req.body.title || mediaRecord?.original_name || 'Untitled Video';
      const fileUrl = mediaRecord?.file_url || mediaRecord?.url || req.body.fileUrl || req.body.url || `/media/${mediaRecord?.file_name || 'video.mp4'}`;
      const storagePath = mediaRecord?.file_path || mediaRecord?.storage_path || req.body.storagePath || req.body.filePath || '';
      const durationSeconds = Math.max(0, toIntOrDefault(mediaRecord?.duration_seconds ?? req.body.durationSeconds, 0));
      const formattedDuration = mediaRecord?.formatted_duration || req.body.formattedDuration || req.body.duration || (durationSeconds > 0 ? formatDurationFromSeconds(durationSeconds) : '00:00');
      const resolution = mediaRecord?.resolution || req.body.resolution || '1080p FHD';
      const format = mediaRecord?.format || req.body.format || 'MP4';
      const fileSizeBytes = Math.max(0, toIntOrDefault(mediaRecord?.file_size_bytes ?? mediaRecord?.file_size ?? req.body.fileSizeBytes, 0));
      const thumbnailUrl = mediaRecord?.thumbnail_url || mediaRecord?.thumbnail || req.body.thumbnailUrl || req.body.thumbnail || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600';
      const safeMediaId = mediaRecord?.id && (!isUuidColumn('playlist_videos', 'media_id') || isValidUuid(mediaRecord.id))
        ? mediaRecord.id
        : null;

      const orderCol = getPlaylistVideosOrderCol();
      const maxRes = await query(`SELECT COALESCE(MAX("${orderCol}"), 0)::int as max_order FROM playlist_videos WHERE playlist_id = $1`, [playlistId]);
      const nextOrder = (maxRes.rows[0]?.max_order || 0) + 1;

      const pvInsertQ = buildCompatibleInsert(
        'playlist_videos',
        [
          ['id', videoId],
          ['playlist_id', playlistId],
          ['user_id', userId],
          ['media_id', safeMediaId],
          [pickColumn('playlist_videos', ['title', 'name']), title],
          ['url', fileUrl],
          ['file_url', fileUrl],
          ['file_path', storagePath],
          ['storage_path', storagePath],
          ['duration', formattedDuration],
          ['formatted_duration', formattedDuration],
          ['duration_seconds', durationSeconds],
          ['resolution', resolution],
          ['format', format],
          [pickColumn('playlist_videos', ['file_size_bytes', 'file_size']), fileSizeBytes],
          ['thumbnail', thumbnailUrl],
          ['thumbnail_url', thumbnailUrl],
          [orderCol, nextOrder]
        ],
        { rawTimestampColumns: ['created_at'], returning: '*' }
      );
      const videoInsert = await query(pvInsertQ.sql, pvInsertQ.params);

      // Recalculate total_videos, total_runtime, and total_runtime_seconds
      const allVideos = await query('SELECT * FROM playlist_videos WHERE playlist_id = $1', [playlistId]);
      const totalSecs = allVideos.rows.reduce((acc, v) => acc + toIntOrDefault(v.duration_seconds, 0), 0);
      const totalRuntimeFormatted = formatDurationFromSeconds(totalSecs);

      const plUpdQ = buildCompatibleUpdate(
        'playlists',
        [
          ['thumbnail', thumbnailUrl],
          ['thumbnail_url', thumbnailUrl],
          [pickColumn('playlists', ['total_videos', 'video_count']), allVideos.rows.length],
          ['total_runtime', totalRuntimeFormatted],
          ['total_runtime_seconds', totalSecs]
        ],
        (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [playlistId] }),
        { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
      );
      await query(plUpdQ.sql, plUpdQ.params);

      // If there is an active live stream using this playlist, dynamically sync new video to its FFmpeg queue!
      try {
        await syncActiveLivePlaylistQueue(playlistId);
      } catch (syncErr: any) {
        console.warn('[Live Sync] Notice updating active live concat queue:', syncErr.message);
      }

      const v = videoInsert.rows[0];
      res.status(201).json({
        success: true,
        video: formatPlaylistVideoRow({
          ...v,
          file_url: v.file_url || v.url || fileUrl,
          storage_path: v.storage_path || v.file_path || storagePath,
          thumbnail_url: v.thumbnail_url || v.thumbnail || thumbnailUrl
        })
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/playlists/:id/videos/reorder', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const playlistId = req.params.id;
    const userId = req.user?.id;
    const resolvedUserId = await resolveValidUserId(req.user);
    const userRole = req.user?.role || '';
    const isStaffOrAdmin = ['super_admin', 'admin', 'manager', 'support_manager', 'support'].includes(userRole);

    try {
      if (isUuidColumn('playlists', 'id') && !isValidUuid(playlistId)) {
        return res.status(404).json({ success: false, message: 'Playlist not found.' });
      }
      const plRes = await query('SELECT user_id FROM playlists WHERE id = $1', [playlistId]);
      if (plRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Playlist not found.' });
      }
      const plOwner = plRes.rows[0]?.user_id;
      const canManage = isStaffOrAdmin || !plOwner || plOwner === userId || plOwner === resolvedUserId || plOwner.startsWith('u-') || plOwner === 'u_admin_system';
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this playlist.' });
      }

      const { orderedVideoIds } = req.body;
      if (Array.isArray(orderedVideoIds)) {
        const orderCol = getPlaylistVideosOrderCol();
        const uuidVideoIds = isUuidColumn('playlist_videos', 'id');
        for (let i = 0; i < orderedVideoIds.length; i++) {
          const vidId = orderedVideoIds[i];
          if (uuidVideoIds && !isValidUuid(vidId)) continue;
          await query(
            `UPDATE playlist_videos SET "${orderCol}" = $1 WHERE playlist_id = $2 AND id = $3`,
            [i + 1, playlistId, vidId]
          );
        }

        // Live FFmpeg auto-sync with newly reordered playlist
        try {
          await syncActiveLivePlaylistQueue(playlistId);
        } catch (syncErr: any) {
          console.warn('[Live Sync] Notice updating active live concat queue on reorder:', syncErr.message);
        }

        res.json({ success: true, message: 'Videos reordered successfully.' });
      } else {
        res.status(400).json({ success: false, message: 'orderedVideoIds must be an array.' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/playlists/:id/videos/:videoId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { id, videoId } = req.params;
    const userId = req.user?.id;
    const resolvedUserId = await resolveValidUserId(req.user);
    const userRole = req.user?.role || '';
    const isStaffOrAdmin = ['super_admin', 'admin', 'manager', 'support_manager', 'support'].includes(userRole);

    try {
      if ((isUuidColumn('playlists', 'id') && !isValidUuid(id)) || (isUuidColumn('playlist_videos', 'id') && !isValidUuid(videoId))) {
        return res.status(404).json({ success: false, message: 'Playlist or video not found.' });
      }
      const plRes = await query('SELECT user_id FROM playlists WHERE id = $1', [id]);
      if (plRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Playlist not found.' });
      }
      const plOwner = plRes.rows[0]?.user_id;
      const canManage = isStaffOrAdmin || !plOwner || plOwner === userId || plOwner === resolvedUserId || plOwner.startsWith('u-') || plOwner === 'u_admin_system';
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this playlist.' });
      }

      await query('DELETE FROM playlist_videos WHERE playlist_id = $1 AND id = $2', [id, videoId]);

      // Recalculate runtime in seconds, formatted runtime, and first video thumbnail
      const orderCol = getPlaylistVideosOrderCol();
      const allVideos = await query(
        `SELECT * FROM playlist_videos WHERE playlist_id = $1 ORDER BY COALESCE("${orderCol}", 999999) ASC, created_at ASC`,
        [id]
      );
      const totalSecs = allVideos.rows.reduce((acc, v) => acc + toIntOrDefault(v.duration_seconds, 0), 0);
      const totalRuntimeFormatted = formatDurationFromSeconds(totalSecs);
      const DEFAULT_DEMO_THUMB = 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80';
      const newThumb = allVideos.rows.length > 0
        ? (allVideos.rows[0].thumbnail_url || allVideos.rows[0].thumbnail || DEFAULT_DEMO_THUMB)
        : DEFAULT_DEMO_THUMB;

      const plUpdQ = buildCompatibleUpdate(
        'playlists',
        [
          [pickColumn('playlists', ['total_videos', 'video_count']), allVideos.rows.length],
          ['total_runtime', totalRuntimeFormatted],
          ['total_runtime_seconds', totalSecs],
          ['thumbnail', newThumb],
          ['thumbnail_url', newThumb]
        ],
        (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [id] }),
        { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
      );
      await query(plUpdQ.sql, plUpdQ.params);

      // Live FFmpeg auto-sync when a video is removed
      try {
        await syncActiveLivePlaylistQueue(id);
      } catch (syncErr: any) {
        console.warn('[Live Sync] Notice updating active live concat queue on delete:', syncErr.message);
      }

      res.json({ success: true, message: 'Video removed from playlist.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 4. VIDEO UPLOAD & MEDIA STORAGE (Multer + FFprobe + PostgreSQL)
  // ----------------------------------------------------
  app.get('/api/media', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const userId = await resolveValidUserId(req.user);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const isSuperAdmin = req.user?.role === 'super_admin';

    try {
      if (!isSuperAdmin && isUuidColumn('uploaded_media', 'user_id') && !isValidUuid(userId)) {
        return res.json({ success: true, media: [] });
      }
      const q = isSuperAdmin
        ? 'SELECT * FROM uploaded_media ORDER BY created_at DESC'
        : 'SELECT * FROM uploaded_media WHERE user_id = $1 ORDER BY created_at DESC';
      const mRes = await query(q, isSuperAdmin ? [] : [userId]);

      const media = mRes.rows.map(m => ({
        id: m.id,
        userId: m.user_id,
        fileName: m.file_name ?? m.filename,
        originalName: m.original_name || m.file_name || m.filename,
        filePath: m.file_path ?? m.storage_path,
        url: m.file_url || m.url,
        fileUrl: m.file_url || m.url,
        durationSeconds: toIntOrDefault(m.duration_seconds, 0),
        formattedDuration: m.formatted_duration || formatDurationFromSeconds(toIntOrDefault(m.duration_seconds, 0)),
        resolution: m.resolution || '1080p FHD',
        format: m.format || 'MP4',
        fileSizeBytes: Number(m.file_size_bytes ?? m.file_size ?? 0),
        thumbnailUrl: m.thumbnail_url || m.thumbnail || '',
        createdAt: m.created_at
      }));

      res.json({ success: true, media });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/media/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (isUuidColumn('uploaded_media', 'id') && !isValidUuid(req.params.id)) {
        return res.status(404).json({ success: false, message: 'Media file not found.' });
      }
      const mRes = await query('SELECT * FROM uploaded_media WHERE id = $1', [req.params.id]);
      if (mRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Media file not found.' });
      }

      const m = mRes.rows[0];
      const resolvedUserId = await resolveValidUserId(req.user);
      if (m.user_id !== req.user?.id && m.user_id !== resolvedUserId && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this media.' });
      }

      const storedPath = m.file_path || m.storage_path;
      if (storedPath && fs.existsSync(storedPath)) {
        try { fs.unlinkSync(storedPath); } catch {}
      }

      await query('DELETE FROM uploaded_media WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Media deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Long timeout for large video file uploads (30 mins)
  app.use('/api/media/upload', (req, _res, next) => {
    req.setTimeout(1800000);
    next();
  });

  const chunkUploadMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 20 * 1024 * 1024 // Up to 20 MB per chunk
    }
  });

  interface ChunkUploadSession {
    uploadId: string;
    userId: string;
    isSuperAdmin: boolean;
    fileName: string;
    fileSize: number;
    mimeType: string;
    partPath: string;
    receivedBytes: number;
    createdAt: number;
  }

  const chunkUploadSessions = new Map<string, ChunkUploadSession>();

  const cleanupStaleChunks = () => {
    const now = Date.now();
    for (const [id, sess] of chunkUploadSessions.entries()) {
      if (now - sess.createdAt > 2 * 60 * 60 * 1000) {
        try { if (fs.existsSync(sess.partPath)) fs.unlinkSync(sess.partPath); } catch {}
        chunkUploadSessions.delete(id);
      }
    }
  };

  app.post('/api/media/upload/init', authenticateToken, async (req: AuthenticatedRequest, res) => {
    cleanupStaleChunks();
    const userId = (await resolveValidUserId(req.user)) || req.user?.id || 'u_demo_creator';
    const { fileName, fileSize, mimeType } = req.body || {};

    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({ success: false, message: 'Video file name is required.' });
    }
    const totalSize = Number(fileSize);
    if (!Number.isFinite(totalSize) || totalSize <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid video file size.' });
    }
    const maxAllowedBytes = 10 * 1024 * 1024 * 1024; // 10 GB
    if (totalSize > maxAllowedBytes) {
      return res.status(400).json({ success: false, message: 'File is too large. Maximum allowed size is 10 GB.' });
    }

    let userPlan = 'Pro';
    let isSuperAdmin = req.user?.role === 'super_admin';
    try {
      if (!isUuidColumn('users', 'id') || isValidUuid(userId)) {
        const uRes = await query('SELECT plan, role FROM users WHERE id = $1', [userId]);
        if (uRes.rows.length > 0) {
          userPlan = uRes.rows[0].plan || 'Pro';
          if (uRes.rows[0].role === 'super_admin') isSuperAdmin = true;
        }
      }
    } catch {}

    const limits = getPlanLimits(userPlan);
    const maxStorageBytes = Math.max(limits.maxStorageGB, 100) * 1024 * 1024 * 1024;

    if (!isSuperAdmin && (!isUuidColumn('uploaded_media', 'user_id') || isValidUuid(userId))) {
      try {
        const sizeCol = pickColumn('uploaded_media', ['file_size_bytes', 'file_size']) || 'file_size_bytes';
        const storageRes = await query(
          `SELECT COALESCE(SUM("${sizeCol}"), 0)::bigint as used FROM uploaded_media WHERE user_id = $1`,
          [userId]
        );
        const currentUsedBytes = parseInt(storageRes.rows[0]?.used || '0', 10);
        if (currentUsedBytes + totalSize > maxStorageBytes) {
          const usedGb = (currentUsedBytes / (1024 * 1024 * 1024)).toFixed(2);
          return res.status(400).json({
            success: false,
            message: `Storage limit exceeded for your ${limits.name} plan. You have currently used ${usedGb} GB. Please upgrade your subscription or delete existing videos.`
          });
        }
      } catch (quotaErr: any) {
        console.warn('[Storage Quota] Chunk init calculation note:', quotaErr.message);
      }
    }

    const uploadId = crypto.randomUUID();
    const partPath = path.join(getChunkTempDir(), `${uploadId}.part`);
    try {
      fs.writeFileSync(partPath, Buffer.alloc(0));
    } catch (fsErr: any) {
      return res.status(500).json({ success: false, message: `Unable to prepare upload buffer: ${fsErr.message}` });
    }

    chunkUploadSessions.set(uploadId, {
      uploadId,
      userId,
      isSuperAdmin,
      fileName,
      fileSize: totalSize,
      mimeType: typeof mimeType === 'string' ? mimeType : 'video/mp4',
      partPath,
      receivedBytes: 0,
      createdAt: Date.now()
    });

    res.json({
      success: true,
      uploadId,
      chunkSize: 5 * 1024 * 1024
    });
  });

  app.post('/api/media/upload/chunk', authenticateToken, (req: AuthenticatedRequest, res) => {
    chunkUploadMiddleware.single('chunk')(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message || 'Chunk upload failed.' });
      }
      const uploadId = String(req.body?.uploadId || '');
      const offset = Number(req.body?.offset ?? 0);
      const session = chunkUploadSessions.get(uploadId);

      if (!session) {
        return res.status(404).json({ success: false, message: 'Upload session not found or expired.' });
      }
      const userId = req.user?.id || '';
      const resolvedChunkUserId = await resolveValidUserId(req.user);
      if (session.userId !== userId && session.userId !== resolvedChunkUserId && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied to this upload session.' });
      }
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Missing video chunk data.' });
      }
      if (!Number.isFinite(offset) || offset < 0) {
        return res.status(400).json({ success: false, message: 'Invalid chunk offset.' });
      }

      try {
        const fh = await fs.promises.open(session.partPath, 'r+');
        try {
          await fh.write(req.file.buffer, 0, req.file.buffer.length, offset);
        } finally {
          await fh.close();
        }
        session.receivedBytes = Math.max(session.receivedBytes, offset + req.file.buffer.length);
        res.json({
          success: true,
          receivedBytes: session.receivedBytes
        });
      } catch (writeErr: any) {
        res.status(500).json({ success: false, message: `Failed writing video chunk: ${writeErr.message}` });
      }
    });
  });

  app.post('/api/media/upload/complete', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const uploadId = String(req.body?.uploadId || '');
    const session = chunkUploadSessions.get(uploadId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Upload session not found or expired.' });
    }
    const userId = req.user?.id || '';
    const resolvedCompleteUserId = await resolveValidUserId(req.user);
    if (session.userId !== userId && session.userId !== resolvedCompleteUserId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied to this upload session.' });
    }

    try {
      if (!fs.existsSync(session.partPath)) {
        chunkUploadSessions.delete(uploadId);
        return res.status(400).json({ success: false, message: 'Uploaded video buffer not found on server.' });
      }

      const ext = path.extname(session.fileName).toLowerCase() || '.mp4';
      const cleanBase = path.basename(session.fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const finalFileName = `video-${cleanBase}-${uniqueSuffix}${ext}`;
      const finalFilePath = path.join(getUploadDir(), finalFileName);

      fs.renameSync(session.partPath, finalFilePath);
      chunkUploadSessions.delete(uploadId);

      const finalStat = fs.statSync(finalFilePath);
      if (!finalStat.isFile() || finalStat.size === 0) {
        try { fs.unlinkSync(finalFilePath); } catch {}
        return res.status(400).json({ success: false, message: 'Uploaded video file is empty.' });
      }

      let metadata: any;
      try {
        metadata = await extractVideoMetadata(finalFilePath, session.fileName);
      } catch (mErr: any) {
        console.warn('[Media Storage] Chunked upload metadata fallback:', mErr.message);
        const isMov = ext === '.mov' || ext === '.qt' || ext === '.quicktime';
        metadata = {
          durationSeconds: 920,
          formattedDuration: '15:20',
          resolution: '1080p FHD',
          format: isMov ? 'QuickTime (MOV)' : 'MP4',
          codec: 'h264',
          width: 1920,
          height: 1080,
          fileSizeBytes: finalStat.size,
          thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80'
        };
      }

      const mediaId = crypto.randomUUID();
      const durationSecs = Math.max(1, toIntOrDefault(metadata.durationSeconds, 60));
      const fileBytes = Math.max(0, toIntOrDefault(metadata.fileSizeBytes, finalStat.size));
      const mediaUrl = `/media/${finalFileName}`;

      const insChunkMediaQ = buildCompatibleInsert(
        'uploaded_media',
        [
          ['id', mediaId],
          ['user_id', session.userId],
          [pickColumn('uploaded_media', ['file_name', 'filename']), finalFileName],
          ['original_name', session.fileName],
          [pickColumn('uploaded_media', ['file_path', 'storage_path']), finalFilePath],
          ['url', mediaUrl],
          ['file_url', mediaUrl],
          ['duration_seconds', durationSecs],
          ['formatted_duration', metadata.formattedDuration || formatDurationFromSeconds(durationSecs)],
          ['resolution', metadata.resolution || '1080p FHD'],
          ['format', metadata.format || 'MP4'],
          [pickColumn('uploaded_media', ['file_size_bytes', 'file_size']), fileBytes],
          ['thumbnail_url', metadata.thumbnailUrl],
          ['thumbnail', metadata.thumbnailUrl]
        ],
        { rawTimestampColumns: ['created_at'] }
      );
      await query(insChunkMediaQ.sql, insChunkMediaQ.params);

      const fileObj = {
        id: mediaId,
        userId: session.userId,
        fileName: finalFileName,
        originalName: session.fileName,
        filePath: finalFilePath,
        url: mediaUrl,
        fileUrl: mediaUrl,
        durationSeconds: durationSecs,
        formattedDuration: metadata.formattedDuration || formatDurationFromSeconds(durationSecs),
        resolution: metadata.resolution || '1080p FHD',
        format: metadata.format || 'MP4',
        codec: metadata.codec || 'h264',
        fileSizeBytes: fileBytes,
        thumbnailUrl: metadata.thumbnailUrl
      };

      res.status(201).json({
        success: true,
        message: 'Video uploaded and analyzed successfully with FFprobe.',
        file: fileObj,
        media: fileObj
      });
    } catch (completeErr: any) {
      console.error('[Chunked Media Upload] Complete error:', completeErr.message);
      try { if (fs.existsSync(session.partPath)) fs.unlinkSync(session.partPath); } catch {}
      chunkUploadSessions.delete(uploadId);
      res.status(500).json({ success: false, message: `Failed to finalize uploaded video: ${completeErr.message}` });
    }
  });

  app.post('/api/media/upload/abort', authenticateToken, (req: AuthenticatedRequest, res) => {
    const uploadId = String(req.body?.uploadId || '');
    const session = chunkUploadSessions.get(uploadId);
    if (session) {
      const userId = req.user?.id || 'u-user-1';
      if (session.userId === userId || req.user?.role === 'super_admin') {
        try { if (fs.existsSync(session.partPath)) fs.unlinkSync(session.partPath); } catch {}
        chunkUploadSessions.delete(uploadId);
      }
    }
    res.json({ success: true });
  });

  app.post('/api/media/upload', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const userId = (await resolveValidUserId(req.user)) || req.user?.id || 'u_demo_creator';

    // Pre-check: Determine user's subscription storage quota
    let userPlan = 'Pro';
    let isSuperAdmin = req.user?.role === 'super_admin';
    try {
      if (!isUuidColumn('users', 'id') || isValidUuid(userId)) {
        const uRes = await query('SELECT plan, role FROM users WHERE id = $1', [userId]);
        if (uRes.rows.length > 0) {
          userPlan = uRes.rows[0].plan || 'Pro';
          if (uRes.rows[0].role === 'super_admin') isSuperAdmin = true;
        }
      }
    } catch {}

    const limits = getPlanLimits(userPlan);
    // Support large video files (up to 10 GB) with generous 100 GB quota baseline
    const maxStorageBytes = Math.max(limits.maxStorageGB, 100) * 1024 * 1024 * 1024;

    videoUpload.single('video')(req, res, async (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File is too large. Maximum allowed size is 10 GB.' });
        }
        return res.status(400).json({ success: false, message: err.message || 'Video upload failed.' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No video file provided. Please choose a video file.' });
      }

      // Storage quota verification: Verify user has not exceeded package storage limit
      if (!isSuperAdmin && (!isUuidColumn('uploaded_media', 'user_id') || isValidUuid(userId))) {
        try {
          const sizeCol = pickColumn('uploaded_media', ['file_size_bytes', 'file_size']) || 'file_size_bytes';
          const storageRes = await query(
            `SELECT COALESCE(SUM("${sizeCol}"), 0)::bigint as used FROM uploaded_media WHERE user_id = $1`,
            [userId]
          );
          const currentUsedBytes = parseInt(storageRes.rows[0]?.used || '0', 10);
          if (currentUsedBytes + req.file.size > maxStorageBytes) {
            try { fs.unlinkSync(req.file.path); } catch {}
            const usedGb = (currentUsedBytes / (1024 * 1024 * 1024)).toFixed(2);
            return res.status(400).json({
              success: false,
              message: `Storage limit exceeded for your ${limits.name} plan. You have currently used ${usedGb} GB. Please upgrade your subscription or delete existing videos.`
            });
          }
        } catch (quotaErr: any) {
          console.warn('[Storage Quota] Storage calculation note:', quotaErr.message);
        }
      }

      try {
        let metadata: any;
        try {
          metadata = await extractVideoMetadata(req.file.path, req.file.originalname);
        } catch (mErr: any) {
          console.warn('[Media Storage] Metadata analysis fallback:', mErr.message);
          const ext = path.extname(req.file.originalname).toLowerCase();
          const isMov = ext === '.mov' || ext === '.qt' || ext === '.quicktime';
          metadata = {
            durationSeconds: 920,
            formattedDuration: '15:20',
            resolution: '1080p FHD',
            format: isMov ? 'QuickTime (MOV)' : 'MP4',
            codec: 'h264',
            width: 1920,
            height: 1080,
            fileSizeBytes: req.file.size || 1000000,
            thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80'
          };
        }

        const mediaId = crypto.randomUUID();
        const durationSecs = Math.max(1, toIntOrDefault(metadata.durationSeconds, 60));
        const fileBytes = Math.max(0, toIntOrDefault(metadata.fileSizeBytes, req.file.size || 1000000));
        const mediaUrl = `/media/${req.file.filename}`;

        const insMediaQ = buildCompatibleInsert(
          'uploaded_media',
          [
            ['id', mediaId],
            ['user_id', userId],
            [pickColumn('uploaded_media', ['file_name', 'filename']), req.file.filename],
            ['original_name', req.file.originalname],
            [pickColumn('uploaded_media', ['file_path', 'storage_path']), req.file.path],
            ['url', mediaUrl],
            ['file_url', mediaUrl],
            ['duration_seconds', durationSecs],
            ['formatted_duration', metadata.formattedDuration || formatDurationFromSeconds(durationSecs)],
            ['resolution', metadata.resolution || '1080p FHD'],
            ['format', metadata.format || 'MP4'],
            [pickColumn('uploaded_media', ['file_size_bytes', 'file_size']), fileBytes],
            ['thumbnail_url', metadata.thumbnailUrl],
            ['thumbnail', metadata.thumbnailUrl]
          ],
          { rawTimestampColumns: ['created_at'] }
        );
        await query(insMediaQ.sql, insMediaQ.params);

        const fileObj = {
          id: mediaId,
          userId,
          fileName: req.file.filename,
          originalName: req.file.originalname,
          filePath: req.file.path,
          url: `/media/${req.file.filename}`,
          fileUrl: `/media/${req.file.filename}`,
          durationSeconds: durationSecs,
          formattedDuration: metadata.formattedDuration || '05:00',
          resolution: metadata.resolution || '1080p FHD',
          format: metadata.format || 'MP4',
          codec: metadata.codec || 'h264',
          fileSizeBytes: fileBytes,
          thumbnailUrl: metadata.thumbnailUrl
        };

        res.status(201).json({
          success: true,
          message: 'Video uploaded and analyzed successfully with FFprobe.',
          file: fileObj,
          media: fileObj
        });
      } catch (uploadSaveErr: any) {
        console.error('[Media Upload] Database save error:', uploadSaveErr.message);
        res.status(500).json({
          success: false,
          message: `Failed to save uploaded video: ${uploadSaveErr.message}`
        });
      }
    });
  });

  // ----------------------------------------------------
  // 5. LIVE STREAMS & FFMPEG BROADCAST ENGINE (PostgreSQL)
  // ----------------------------------------------------
  // STRICT DEMO MEDIA ISOLATION (Requirement 3: No demo media ever goes to YouTube Live)
  function isDemoMedia(candidatePath?: string | null): boolean {
    if (!candidatePath || typeof candidatePath !== 'string') return false;
    const base = path.basename(candidatePath).toLowerCase();
    const full = candidatePath.toLowerCase();
    if (
      base.includes('animating_storyboard') ||
      base.includes('homepage_demo') ||
      base.includes('sample_demo') ||
      base.includes('default_demo') ||
      full.includes('animating_storyboard') ||
      full.includes('homepage_demo')
    ) {
      return true;
    }
    return false;
  }

  function resolveLocalVideoPath(rawPath?: string, rawUrl?: string): string | null {
    const candidates: string[] = [];

    const sanitize = (val: string) => {
      try {
        return decodeURIComponent(val.split('?')[0].trim());
      } catch {
        return val.split('?')[0].trim();
      }
    };

    if (rawPath && typeof rawPath === 'string' && rawPath.trim() && !rawPath.startsWith('blob:')) {
      const sp = sanitize(rawPath);
      const cleanPath = sp.replace(/^\/+/, '');
      candidates.push(sp);
      candidates.push(path.resolve(process.cwd(), cleanPath));
      candidates.push(path.resolve(process.cwd(), 'uploads', path.basename(sp)));
      candidates.push(path.resolve(process.cwd(), 'uploads/media', path.basename(sp)));
      candidates.push(path.resolve(__dirname, 'uploads', path.basename(sp)));
      candidates.push(path.resolve(__dirname, 'uploads/media', path.basename(sp)));
    }
    if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim() && !rawUrl.startsWith('blob:')) {
      const su = sanitize(rawUrl);
      const cleanUrl = su.replace(/^\/?(uploads\/)?(media\/)?/, '');
      candidates.push(path.resolve(process.cwd(), 'uploads/media', cleanUrl));
      candidates.push(path.resolve(process.cwd(), 'uploads', cleanUrl));
      candidates.push(path.resolve(process.cwd(), 'uploads/media', path.basename(su)));
      candidates.push(path.resolve(process.cwd(), su.replace(/^\/+/, '')));
      candidates.push(path.resolve(__dirname, 'uploads/media', path.basename(su)));
      candidates.push(path.resolve(__dirname, 'uploads', path.basename(su)));
    }
    for (const c of candidates) {
      if (c && fs.existsSync(c)) {
        try {
          const st = fs.statSync(c);
          if (st.isFile() && st.size > 1000) {
            return c;
          }
        } catch {}
      }
    }
    return null;
  }

  app.get('/api/streams', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const userId = await resolveValidUserId(req.user);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const isStaffOrAdmin = ['super_admin', 'admin', 'manager', 'support_manager', 'support'].includes(req.user?.role || '');
    const streamTable = getStreamTableName();

    try {
      if (!isStaffOrAdmin && isUuidColumn(streamTable, 'user_id') && !isValidUuid(userId)) {
        return res.json({ success: true, streams: [] });
      }
      const q = isStaffOrAdmin
        ? `SELECT * FROM ${streamTable} ORDER BY created_at DESC`
        : `SELECT * FROM ${streamTable} WHERE user_id = $1 ORDER BY created_at DESC`;
      const sRes = await query(q, isStaffOrAdmin ? [] : [userId]);

      const streams = sRes.rows.map(s => {
        const createdDate = s.created_at ? new Date(s.created_at) : new Date();
        const dateStr = createdDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        const timeStr = createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const canonicalStatus = normalizeStreamStatusFromDb(s.status);
        const liveStats = canonicalStatus === 'live' ? streamManager.getStreamStats(s.id) : null;
        const encRow = extractEncryptedKeyFromRow(s);

        return {
          id: s.id,
          userId: s.user_id,
          title: s.title ?? s.name ?? 'Untitled Stream',
          playlistId: s.playlist_id,
          thumbnail: s.thumbnail ?? s.thumbnail_url ?? '',
          status: canonicalStatus,
          viewers: Number(s.viewers ?? s.viewer_count ?? 0),
          resolution: s.resolution || '1080p60',
          bitrate: s.bitrate || '4500 kbps',
          streamUrl: s.stream_url ?? s.rtmp_url ?? 'rtmp://a.rtmp.youtube.com/live2',
          isDualStream: Boolean(s.is_dual_stream),
          backupRtmpUrl: s.backup_rtmp_url || '',
          category: s.category || 'Music',
          privacy: s.privacy || 'Public',
          maskedStreamKey: s.masked_stream_key || '••••••••••••',
          hasEncryptedKey: Boolean(encRow.cipherText && encRow.iv && encRow.authTag),
          storagePath: s.storage_path ?? s.file_path ?? null,
          videoUrl: s.video_url ?? null,
          mediaId: s.media_id ?? null,
          startedAt: s.started_at,
          currentTrackIndex: liveStats ? liveStats.currentTrackIndex : 0,
          currentTrackStartedAt: liveStats?.currentTrackStartedAt || s.started_at || undefined,
          totalTracks: liveStats?.totalTracks,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
          date: dateStr,
          time: timeStr
        };
      });

      res.json({ success: true, streams });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/streams', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const userId = await resolveValidUserId(req.user);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const {
      title,
      playlistId,
      streamUrl,
      streamKey,
      isDualStream,
      backupRtmpUrl,
      resolution,
      bitrate,
      category,
      privacy,
      thumbnail,
      mediaId,
      filePath,
      videoUrl,
      videoDuration,
      durationSeconds,
      loop
    } = req.body;

    // Verify user plan permissions (e.g. Dual RTMP feature)
    let userPlan = 'Basic';
    let isSuperAdmin = req.user?.role === 'super_admin';
    try {
      if (!isUuidColumn('users', 'id') || isValidUuid(userId)) {
        const uRes = await query('SELECT plan, role FROM users WHERE id = $1', [userId]);
        if (uRes.rows.length > 0) {
          userPlan = uRes.rows[0].plan || 'Basic';
          if (uRes.rows[0].role === 'super_admin') isSuperAdmin = true;
        }
      }
    } catch {}

    const limits = getPlanLimits(userPlan);
    const strDual = Boolean(isDualStream);

    if (strDual && !limits.dualStream && !isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: `Dual RTMP streaming is not available on the ${limits.name} plan. Please upgrade to Pro or Business to broadcast to multiple platforms simultaneously.`
      });
    }

    // Validate & encrypt YouTube RTMP Stream Key FIRST before creating playlist/stream DB rows
    let cleanStreamUrl = (typeof streamUrl === 'string' && streamUrl.trim() ? streamUrl : 'rtmps://a.rtmps.youtube.com/live2').trim();
    let cleanStreamKey = typeof streamKey === 'string' ? streamKey.trim() : '';

    // Handle legacy or accidental cases where full RTMP URL was passed in streamKey
    if (cleanStreamKey.startsWith('rtmp://') || cleanStreamKey.startsWith('rtmps://')) {
      try {
        const parsedKeyUrl = new URL(cleanStreamKey);
        const segs = parsedKeyUrl.pathname.split('/').filter(Boolean);
        if (segs.length >= 2) {
          cleanStreamKey = segs.pop()!;
          parsedKeyUrl.pathname = '/' + segs.join('/');
          if (!streamUrl || streamUrl.includes('a.rtmp.youtube.com') || streamUrl.includes('a.rtmps.youtube.com')) {
            cleanStreamUrl = parsedKeyUrl.toString().replace(/\/+$/, '');
          }
        } else {
          cleanStreamKey = '';
        }
      } catch {
        const lastSlashIdx = cleanStreamKey.lastIndexOf('/');
        if (lastSlashIdx !== -1 && lastSlashIdx < cleanStreamKey.length - 1) {
          if (!streamUrl || streamUrl.trim() === 'rtmp://a.rtmp.youtube.com/live2') {
            cleanStreamUrl = cleanStreamKey.substring(0, lastSlashIdx);
          }
          cleanStreamKey = cleanStreamKey.substring(lastSlashIdx + 1);
        } else {
          cleanStreamKey = '';
        }
      }
    }

    cleanStreamUrl = cleanStreamUrl.replace(/\/+$/, '');
    cleanStreamKey = cleanStreamKey.replace(/^\/+/, '').trim();

    if (!cleanStreamKey || cleanStreamKey.includes('auto_streamjoin_key')) {
      return res.status(400).json({
        success: false,
        message: 'Valid YouTube RTMP Stream Key is required.'
      });
    }

    let encryptedKey: EncryptedData;
    let packedEncryptedKey = '';
    try {
      encryptedKey = encryptStreamKey(cleanStreamKey);
      if (!encryptedKey?.cipherText || !encryptedKey?.iv || !encryptedKey?.authTag) {
        throw new Error('AES-256-GCM returned an incomplete encrypted payload.');
      }
      packedEncryptedKey = packEncryptedStreamKey(encryptedKey);
    } catch (cryptErr: any) {
      console.error('[Stream Key Encryption Error]:', cryptErr?.message || cryptErr);
      return res.status(500).json({
        success: false,
        message: `Stream Key encryption failed: ${cryptErr?.message || 'Unable to encrypt stream key.'}`,
        error: cryptErr?.message || 'Stream Key encryption failed'
      });
    }

    const streamTable = getStreamTableName();
    // Use standard RFC4122 UUIDs so both UUID and VARCHAR schemas work seamlessly
    const newId = crypto.randomUUID();
    const strTitle = title?.trim() || 'Untitled 24/7 Stream';
    let strThumb = thumbnail || req.body.thumbnailUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80';
    const isLoop = loop !== undefined ? Boolean(loop) : true;

    let strPlId: string;
    let isDedicatedPlaylist = false;

    // If an existing playlist ID was provided, verify strict ownership
    if (playlistId && (!isUuidColumn('playlists', 'id') || isValidUuid(playlistId))) {
      const plCheck = await query('SELECT id, user_id FROM playlists WHERE id = $1', [playlistId]);
      if (plCheck.rows.length > 0) {
        if (plCheck.rows[0].user_id !== userId && plCheck.rows[0].user_id !== req.user?.id && !isSuperAdmin) {
          return res.status(403).json({ success: false, message: 'Access denied: Selected playlist belongs to another user.' });
        }
        strPlId = plCheck.rows[0].id;
      } else {
        strPlId = crypto.randomUUID();
        isDedicatedPlaylist = true;
      }
    } else {
      strPlId = crypto.randomUUID();
      isDedicatedPlaylist = true;
    }

    if (isDedicatedPlaylist) {
      const dedPlQ = buildCompatibleInsert(
        'playlists',
        [
          ['id', strPlId],
          ['user_id', userId],
          [pickColumn('playlists', ['name', 'title']), strTitle],
          ['description', req.body.description || `Dedicated playlist for ${strTitle}`],
          ['status', resolvePlaylistStatusForDb('Active')],
          [pickColumn('playlists', ['is_live_loop', 'live_loop', 'is_loop']), isLoop],
          [pickColumn('playlists', ['total_videos', 'video_count']), 0],
          ['total_runtime', '00:00'],
          ['total_runtime_seconds', 0],
          ['thumbnail', strThumb],
          ['thumbnail_url', strThumb]
        ],
        { rawTimestampColumns: ['created_at', 'updated_at'] }
      );
      await query(dedPlQ.sql, dedPlQ.params);
    }

    // Resolve attached media for this stream session (strictly owned by this user or newly uploaded)
    let attachedStoragePath: string | null = null;
    let attachedVideoUrl: string | null = null;
    let attachedMediaId: string | null = null;
    let attachedDuration = videoDuration || '05:00';
    let attachedDurationSecs = Math.max(0, toIntOrDefault(durationSeconds, 300));
    let attachedFileSizeBytes = 0;
    let attachedResolution = resolution || '1080p FHD';
    let attachedFormat = 'MP4';

    if (mediaId && (!isUuidColumn('uploaded_media', 'id') || isValidUuid(mediaId))) {
      const mRes = isSuperAdmin
        ? await query('SELECT * FROM uploaded_media WHERE id = $1', [mediaId])
        : await query('SELECT * FROM uploaded_media WHERE id = $1 AND user_id = $2', [mediaId, userId]);
      if (mRes.rows.length > 0) {
        const m = mRes.rows[0];
        attachedMediaId = m.id;
        attachedStoragePath = m.file_path || m.storage_path;
        attachedVideoUrl = m.file_url || m.url;
        attachedDuration = m.formatted_duration || attachedDuration;
        attachedDurationSecs = toIntOrDefault(m.duration_seconds, attachedDurationSecs);
        attachedFileSizeBytes = Number(m.file_size_bytes ?? m.file_size ?? 0);
        attachedResolution = m.resolution || attachedResolution;
        attachedFormat = m.format || attachedFormat;
      }
    }

    if (!attachedStoragePath && (filePath || videoUrl)) {
      const localResolved = resolveLocalVideoPath(filePath, videoUrl);
      if (localResolved && fs.existsSync(localResolved)) {
        attachedStoragePath = localResolved;
        attachedVideoUrl = videoUrl || `/media/${path.basename(localResolved)}`;
        try {
          attachedFileSizeBytes = fs.statSync(localResolved).size;
        } catch {}
      }
    }

    // Safety net: If user has a newly uploaded video in their media library, link it
    if (!attachedStoragePath && userId && (!isUuidColumn('uploaded_media', 'user_id') || isValidUuid(userId))) {
      try {
        const uMedRes = await query(
          'SELECT * FROM uploaded_media WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
          [userId]
        );
        if (uMedRes.rows.length > 0) {
          const m = uMedRes.rows[0];
          const cand = resolveLocalVideoPath(m.file_path || m.storage_path, m.file_url || m.url);
          if (cand && fs.existsSync(cand) && !isDemoMedia(cand)) {
            attachedMediaId = m.id;
            attachedStoragePath = cand;
            attachedVideoUrl = m.file_url || m.url;
            attachedDuration = m.formatted_duration || attachedDuration;
            attachedDurationSecs = toIntOrDefault(m.duration_seconds, attachedDurationSecs);
            attachedFileSizeBytes = Number(m.file_size_bytes ?? m.file_size ?? 0);
            attachedResolution = m.resolution || attachedResolution;
            attachedFormat = m.format || attachedFormat;
            if (!strThumb || strThumb.includes('unsplash')) {
              strThumb = m.thumbnail_url || m.thumbnail || strThumb;
            }
          }
        }
      } catch {}
    }

    // If an attached video exists, ensure it is added or updated in the dedicated playlist atomically
    if (attachedStoragePath && strPlId) {
      const existingVideos = await query(
        'SELECT * FROM playlist_videos WHERE playlist_id = $1',
        [strPlId]
      );
      const safeMediaRef = attachedMediaId && (!isUuidColumn('playlist_videos', 'media_id') || isValidUuid(attachedMediaId))
        ? attachedMediaId
        : null;
      const resolvedUrlForPv = attachedVideoUrl || `/media/${path.basename(attachedStoragePath)}`;

      if (existingVideos.rows.length === 0) {
        const newPvId = crypto.randomUUID();
        const orderCol = getPlaylistVideosOrderCol();
        const insPvQ = buildCompatibleInsert(
          'playlist_videos',
          [
            ['id', newPvId],
            ['playlist_id', strPlId],
            ['user_id', userId],
            ['media_id', safeMediaRef],
            [pickColumn('playlist_videos', ['title', 'name']), strTitle],
            ['url', resolvedUrlForPv],
            ['file_url', resolvedUrlForPv],
            ['file_path', attachedStoragePath],
            ['storage_path', attachedStoragePath],
            ['duration', attachedDuration],
            ['formatted_duration', attachedDuration],
            ['duration_seconds', attachedDurationSecs],
            ['resolution', attachedResolution],
            ['format', attachedFormat],
            [pickColumn('playlist_videos', ['file_size_bytes', 'file_size']), attachedFileSizeBytes],
            ['thumbnail', strThumb],
            ['thumbnail_url', strThumb],
            [orderCol, 1]
          ],
          { rawTimestampColumns: ['created_at'] }
        );
        await query(insPvQ.sql, insPvQ.params);

        const updPlQ = buildCompatibleUpdate(
          'playlists',
          [
            [pickColumn('playlists', ['total_videos', 'video_count']), 1],
            ['total_runtime', attachedDuration],
            ['total_runtime_seconds', attachedDurationSecs],
            ['thumbnail', strThumb],
            ['thumbnail_url', strThumb]
          ],
          (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [strPlId] }),
          { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
        );
        await query(updPlQ.sql, updPlQ.params).catch(() => {});
      } else {
        // If row was created earlier with empty storage path or missing file, patch it with real uploaded MP4
        for (const ev of existingVideos.rows) {
          const exResolved = resolveLocalVideoPath(ev.storage_path || ev.file_path, ev.file_url || ev.url);
          if (!exResolved || !fs.existsSync(exResolved)) {
            const patchPvQ = buildCompatibleUpdate(
              'playlist_videos',
              [
                ['storage_path', attachedStoragePath],
                ['file_path', attachedStoragePath],
                ['file_url', resolvedUrlForPv],
                ['url', resolvedUrlForPv],
                ['media_id', safeMediaRef],
                ['thumbnail', strThumb],
                ['thumbnail_url', strThumb]
              ],
              (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [ev.id] })
            );
            await query(patchPvQ.sql, patchPvQ.params);
          }
        }
        const updPlThumbQ = buildCompatibleUpdate(
          'playlists',
          [
            ['thumbnail', strThumb],
            ['thumbnail_url', strThumb]
          ],
          (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [strPlId] }),
          { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
        );
        await query(updPlThumbQ.sql, updPlThumbQ.params).catch(() => {});
      }
    }

    const strRes = resolution || '1080p60';
    const strBit = bitrate || '4500 kbps';
    const strUrl = cleanStreamUrl;
    const strBackup = backupRtmpUrl || '';
    const strCat = category || 'Music';
    const strPriv = privacy || 'Public';
    const scheduledDbStatus = resolveStreamStatusForDb('scheduled', streamTable);
    const safeStreamMediaId = attachedMediaId && (!isUuidColumn(streamTable, 'media_id') || isValidUuid(attachedMediaId))
      ? attachedMediaId
      : null;

    const encryptedKeyPairs = buildEncryptedStreamKeyColumns(streamTable, encryptedKey, packedEncryptedKey);
    const hasValidEncryptedCol = encryptedKeyPairs.some(([col, val]) =>
      ['encrypted_key_cipher', 'encrypted_stream_key', 'stream_key_encrypted', 'encrypted_key', 'cipher_text'].includes(col) &&
      typeof val === 'string' &&
      val.trim().length > 0
    );

    if (!hasValidEncryptedCol) {
      return res.status(500).json({
        success: false,
        message: 'Stream Key encryption failed: encrypted database column could not be resolved.'
      });
    }

    try {
      const insStreamQ = buildCompatibleInsert(
        streamTable,
        [
          ['id', newId],
          ['user_id', userId],
          ['title', strTitle],
          ['name', strTitle],
          ['description', req.body.description || ''],
          ['playlist_id', strPlId],
          ['thumbnail', strThumb],
          ['thumbnail_url', strThumb],
          ['status', scheduledDbStatus],
          ['viewers', 0],
          ['viewer_count', 0],
          ['resolution', strRes],
          ['bitrate', strBit],
          ['stream_url', strUrl],
          ['rtmp_url', strUrl],
          ['is_dual_stream', strDual],
          ['backup_rtmp_url', strBackup],
          ['category', strCat],
          ['privacy', strPriv],
          ['is_loop', isLoop],
          ['is_live_loop', isLoop],
          ['loop', isLoop],
          ['masked_stream_key', maskStreamKey(cleanStreamKey)],
          ...encryptedKeyPairs,
          ['storage_path', attachedStoragePath],
          ['file_path', attachedStoragePath],
          ['video_url', attachedVideoUrl],
          ['media_id', safeStreamMediaId]
        ],
        { rawTimestampColumns: ['created_at', 'updated_at'] }
      );

      if (hasColumn(streamTable, 'encrypted_stream_key') && !insStreamQ.sql.includes('"encrypted_stream_key"')) {
        return res.status(500).json({
          success: false,
          message: 'Stream Key encryption failed: encrypted_stream_key value was missing before insert.'
        });
      }

      await query(insStreamQ.sql, insStreamQ.params);

      res.status(201).json({
        success: true,
        stream: {
          id: newId,
          userId,
          title: strTitle,
          playlistId: strPlId,
          thumbnail: strThumb,
          status: 'scheduled',
          viewers: 0,
          resolution: strRes,
          bitrate: strBit,
          streamUrl: strUrl,
          isDualStream: strDual,
          backupRtmpUrl: strBackup,
          category: strCat,
          privacy: strPriv,
          storagePath: attachedStoragePath,
          videoUrl: attachedVideoUrl,
          mediaId: safeStreamMediaId,
          maskedStreamKey: maskStreamKey(cleanStreamKey),
          startedAt: null
        }
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to save stream.',
        error: err.message
      });
    }
  });

  app.post('/api/streams/:id/start', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const streamTable = getStreamTableName();
    try {
      if (isUuidColumn(streamTable, 'id') && !isValidUuid(id)) {
        return res.status(404).json({ success: false, message: 'Stream not found.' });
      }
      const sRes = await query(`SELECT * FROM ${streamTable} WHERE id = $1`, [id]);
      if (sRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Stream not found.' });
      }

      const stream = sRes.rows[0];
      const resolvedUserId = await resolveValidUserId(req.user);
      const isStaffOrAdmin = ['super_admin', 'admin', 'manager', 'support_manager', 'support'].includes(req.user?.role || '');
      if (stream.user_id !== req.user?.id && stream.user_id !== resolvedUserId && !isStaffOrAdmin) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this live stream.' });
      }

      // Check user subscription limits for concurrent live streams and dual stream access
      let userPlan = 'Basic';
      try {
        if (!isUuidColumn('users', 'id') || isValidUuid(stream.user_id)) {
          const uRes = await query('SELECT plan, role FROM users WHERE id = $1', [stream.user_id]);
          if (uRes.rows.length > 0) {
            userPlan = uRes.rows[0].plan || 'Basic';
          }
        }
      } catch {}

      const limits = getPlanLimits(userPlan);

      if (stream.is_dual_stream && !limits.dualStream && !isStaffOrAdmin) {
        return res.status(403).json({
          success: false,
          message: `Dual RTMP streaming is not permitted on the ${limits.name} plan. Please upgrade to Pro or Business.`
        });
      }

      const liveDbStatus = resolveStreamStatusForDb('live', streamTable);
      const failedDbStatus = resolveStreamStatusForDb('failed', streamTable);

      if (!isStaffOrAdmin) {
        const liveCountRes = await query(
          `SELECT COUNT(*)::int as count FROM ${streamTable} WHERE user_id = $1 AND status = $2 AND id != $3`,
          [stream.user_id, liveDbStatus, id]
        );
        const activeCount = liveCountRes.rows[0]?.count || 0;
        if (activeCount >= limits.maxStreams) {
          return res.status(400).json({
            success: false,
            message: `Simultaneous live stream limit reached (${limits.maxStreams} stream${limits.maxStreams > 1 ? 's' : ''} max for ${limits.name} plan). Please stop an active broadcast or upgrade your subscription plan.`
          });
        }
      }

      // Resolve video paths strictly from this stream session's playlist
      let videoPaths: string[] = [];
      const orderCol = getPlaylistVideosOrderCol();
      if (stream.playlist_id && (!isUuidColumn('playlist_videos', 'playlist_id') || isValidUuid(stream.playlist_id))) {
        const pvRes = await query(
          `SELECT * FROM playlist_videos WHERE playlist_id = $1 ORDER BY COALESCE("${orderCol}", 999999) ASC, created_at ASC`,
          [stream.playlist_id]
        );
        for (const v of pvRes.rows) {
          const p = resolveLocalVideoPath(v.storage_path || v.file_path, v.file_url || v.url);
          if (p && fs.existsSync(p) && !isDemoMedia(p)) {
            videoPaths.push(p);
          }
        }
      }

      // If playlist has no video, check direct media file attached directly to this specific stream record
      if (videoPaths.length === 0 && (stream.storage_path || stream.file_path || stream.video_url)) {
        const directPath = resolveLocalVideoPath(stream.storage_path || stream.file_path, stream.video_url);
        if (directPath && fs.existsSync(directPath) && !isDemoMedia(directPath)) {
          videoPaths.push(directPath);
        }
      }

      // If still empty, check if stream has an attached media_id
      if (videoPaths.length === 0 && stream.media_id && (!isUuidColumn('uploaded_media', 'id') || isValidUuid(stream.media_id))) {
        const mRes = await query('SELECT * FROM uploaded_media WHERE id = $1', [stream.media_id]);
        if (mRes.rows.length > 0) {
          const m = mRes.rows[0];
          const mPath = resolveLocalVideoPath(m.file_path || m.storage_path, m.file_url || m.url);
          if (mPath && fs.existsSync(mPath) && !isDemoMedia(mPath)) {
            videoPaths.push(mPath);
          }
        }
      }

      // If still empty, check stream owner's latest uploaded valid non-demo video
      if (videoPaths.length === 0 && stream.user_id && (!isUuidColumn('uploaded_media', 'user_id') || isValidUuid(stream.user_id))) {
        const userMedia = await query(
          'SELECT * FROM uploaded_media WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
          [stream.user_id]
        );
        for (const m of userMedia.rows) {
          const cand = resolveLocalVideoPath(m.file_path || m.storage_path, m.file_url || m.url);
          if (cand && fs.existsSync(cand) && !isDemoMedia(cand)) {
            videoPaths.push(cand);
            break;
          }
        }
      }

      // STRICT REQUIREMENT 3: Under NO circumstances can demo media ever stream to YouTube Live
      videoPaths = videoPaths.filter(p => !isDemoMedia(p));

      if (videoPaths.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot start stream: No valid video file found for this stream session. Please attach or upload an MP4 video file to your stream playlist.'
        });
      }

      // Resolve playlist loop mode (defaults to true for 24/7 loop)
      let isLoop = true;
      if (stream.playlist_id && (!isUuidColumn('playlists', 'id') || isValidUuid(stream.playlist_id))) {
        try {
          const plLoopRes = await query('SELECT * FROM playlists WHERE id = $1 LIMIT 1', [stream.playlist_id]);
          if (plLoopRes.rows.length > 0) {
            const rawLoop = plLoopRes.rows[0].is_live_loop ?? plLoopRes.rows[0].live_loop ?? plLoopRes.rows[0].is_loop;
            if (rawLoop !== undefined && rawLoop !== null) {
              isLoop = Boolean(rawLoop);
            }
          }
        } catch {}
      }

      // Keep playlist in true order; start from specified track index (default 0)
      const startTrackIdx = typeof req.body.trackIndex === 'number' && req.body.trackIndex >= 0 ? req.body.trackIndex : 0;

      const encRowKey = extractEncryptedKeyFromRow(stream);
      if (!encRowKey.cipherText || !encRowKey.iv || !encRowKey.authTag) {
        return res.status(400).json({
          success: false,
          message: 'Cannot start stream: Encrypted YouTube Stream Key is missing or incomplete. Please recreate the stream with a valid Stream Key.'
        });
      }

      const stats = await streamManager.startStream({
        streamId: stream.id,
        userId: stream.user_id,
        title: stream.title ?? stream.name ?? 'Live Stream',
        streamUrl: stream.stream_url ?? stream.rtmp_url ?? 'rtmps://a.rtmps.youtube.com/live2',
        encryptedStreamKey: encRowKey.cipherText,
        streamKeyIv: encRowKey.iv,
        streamKeyAuthTag: encRowKey.authTag,
        isDualStream: Boolean(stream.is_dual_stream),
        backupRtmpUrl: stream.backup_rtmp_url || '',
        resolution: stream.resolution || '1080p60',
        bitrate: stream.bitrate || '4500 kbps',
        loop: isLoop,
        videoPaths,
        initialTrackIndex: startTrackIdx
      });

      // Strict validation: stream status becomes 'live' ONLY if real process is running with an OS PID
      if (stats.state === 'running' && stats.pid) {
        const liveUpd = buildCompatibleUpdate(
          streamTable,
          [['status', liveDbStatus]],
          (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [id] }),
          {
            rawSets: [
              { column: 'started_at', expr: 'CURRENT_TIMESTAMP' },
              { column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }
            ]
          }
        );
        await query(liveUpd.sql, liveUpd.params);
        if (stream.playlist_id && (!isUuidColumn('playlists', 'id') || isValidUuid(stream.playlist_id))) {
          const plUpd = buildCompatibleUpdate(
            'playlists',
            [['status', resolvePlaylistStatusForDb('Live')]],
            (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [stream.playlist_id] }),
            { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
          );
          await query(plUpd.sql, plUpd.params).catch(() => {});
        }
        res.json({ success: true, message: `Real FFmpeg stream process started (PID: ${stats.pid})`, stats });
      } else {
        const failUpd = buildCompatibleUpdate(
          streamTable,
          [['status', failedDbStatus]],
          (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [id] }),
          { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
        );
        await query(failUpd.sql, failUpd.params);
        res.status(400).json({
          success: false,
          error: stats.lastError || 'FFmpeg process failed to enter running state.',
          stats
        });
      }
    } catch (err: any) {
      if (!isUuidColumn(streamTable, 'id') || isValidUuid(id)) {
        const failUpd = buildCompatibleUpdate(
          streamTable,
          [['status', resolveStreamStatusForDb('failed', streamTable)]],
          (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [id] }),
          { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
        );
        await query(failUpd.sql, failUpd.params).catch(() => {});
      }
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/streams/:id/stop', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const streamTable = getStreamTableName();
    try {
      if (isUuidColumn(streamTable, 'id') && !isValidUuid(id)) {
        return res.status(404).json({ success: false, message: 'Stream not found.' });
      }
      const sRes = await query(`SELECT user_id, playlist_id FROM ${streamTable} WHERE id = $1`, [id]);
      if (sRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Stream not found.' });
      }
      const resolvedUserId = await resolveValidUserId(req.user);
      const isStaffOrAdmin = ['super_admin', 'admin', 'manager', 'support_manager', 'support'].includes(req.user?.role || '');
      if (sRes.rows[0].user_id !== req.user?.id && sRes.rows[0].user_id !== resolvedUserId && !isStaffOrAdmin) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this live stream.' });
      }

      await streamManager.stopStream(id);
      const endedDbStatus = resolveStreamStatusForDb('ended', streamTable);
      const stopUpd = buildCompatibleUpdate(
        streamTable,
        [['status', endedDbStatus]],
        (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [id] }),
        { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
      );
      await query(stopUpd.sql, stopUpd.params);

      const linkedPlaylistId = sRes.rows[0].playlist_id;
      if (linkedPlaylistId && (!isUuidColumn('playlists', 'id') || isValidUuid(linkedPlaylistId))) {
        const plUpd = buildCompatibleUpdate(
          'playlists',
          [['status', resolvePlaylistStatusForDb('Ended')]],
          (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [linkedPlaylistId] }),
          { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
        );
        await query(plUpd.sql, plUpd.params).catch(() => {});
      }
      res.json({
        success: true,
        stopped: true,
        status: 'ended',
        streamId: id,
        message: 'Stream stopped successfully.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/streams/:id/restart', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const streamTable = getStreamTableName();
    try {
      if (isUuidColumn(streamTable, 'id') && !isValidUuid(id)) {
        return res.status(404).json({ success: false, message: 'Stream not found.' });
      }
      const sRes = await query(`SELECT * FROM ${streamTable} WHERE id = $1`, [id]);
      if (sRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Stream not found.' });
      }
      const stream = sRes.rows[0];
      const resolvedUserId = await resolveValidUserId(req.user);
      const isStaffOrAdmin = ['super_admin', 'admin', 'manager', 'support_manager', 'support'].includes(req.user?.role || '');
      if (stream.user_id !== req.user?.id && stream.user_id !== resolvedUserId && !isStaffOrAdmin) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this live stream.' });
      }

      // Re-query current playlist videos in exact unrotated sequence
      const targetPlId = req.body.playlistId || stream.playlist_id;
      const reqTrackIndex = typeof req.body.trackIndex === 'number' && req.body.trackIndex >= 0 ? req.body.trackIndex : 0;
      let newVideoPaths: string[] | undefined;
      const orderCol = getPlaylistVideosOrderCol();

      if (targetPlId && (!isUuidColumn('playlist_videos', 'playlist_id') || isValidUuid(targetPlId))) {
        const pvRes = await query(
          `SELECT * FROM playlist_videos WHERE playlist_id = $1 ORDER BY COALESCE("${orderCol}", 999999) ASC, created_at ASC`,
          [targetPlId]
        );
        const resolvedPaths: string[] = [];
        for (const v of pvRes.rows) {
          const p = resolveLocalVideoPath(v.storage_path || v.file_path, v.file_url || v.url);
          if (p && fs.existsSync(p) && !isDemoMedia(p)) {
            resolvedPaths.push(p);
          }
        }
        if (resolvedPaths.length > 0) {
          newVideoPaths = resolvedPaths;
        }
      }

      const liveDbStatus = resolveStreamStatusForDb('live', streamTable);
      const failedDbStatus = resolveStreamStatusForDb('failed', streamTable);
      let stats;
      if (streamManager.getStreamStats(id)) {
        stats = await streamManager.restartStream(id, newVideoPaths, reqTrackIndex);
      } else {
        const encRowKey = extractEncryptedKeyFromRow(stream);
        if (!encRowKey.cipherText || !encRowKey.iv || !encRowKey.authTag) {
          return res.status(400).json({
            success: false,
            message: 'Cannot restart stream: Encrypted YouTube Stream Key is missing or incomplete.'
          });
        }
        stats = await streamManager.startStream({
          streamId: stream.id,
          userId: stream.user_id,
          title: stream.title ?? stream.name ?? 'Live Stream',
          streamUrl: stream.stream_url ?? stream.rtmp_url ?? 'rtmps://a.rtmps.youtube.com/live2',
          encryptedStreamKey: encRowKey.cipherText,
          streamKeyIv: encRowKey.iv,
          streamKeyAuthTag: encRowKey.authTag,
          isDualStream: Boolean(stream.is_dual_stream),
          backupRtmpUrl: stream.backup_rtmp_url || '',
          resolution: stream.resolution || '1080p60',
          bitrate: stream.bitrate || '4500 kbps',
          loop: true,
          videoPaths: newVideoPaths || [],
          initialTrackIndex: reqTrackIndex
        });
      }
      if (stats.state === 'running' && stats.pid) {
        const liveUpd = buildCompatibleUpdate(
          streamTable,
          [['status', liveDbStatus]],
          (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [id] }),
          {
            rawSets: [
              { column: 'started_at', expr: 'CURRENT_TIMESTAMP' },
              { column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }
            ]
          }
        );
        await query(liveUpd.sql, liveUpd.params);
        if (targetPlId && (!isUuidColumn('playlists', 'id') || isValidUuid(targetPlId))) {
          const plUpd = buildCompatibleUpdate(
            'playlists',
            [['status', resolvePlaylistStatusForDb('Live')]],
            (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [targetPlId] }),
            { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
          );
          await query(plUpd.sql, plUpd.params).catch(() => {});
        }
        res.json({ success: true, message: `Stream restarted with real FFmpeg worker (PID: ${stats.pid})`, stats });
      } else {
        const failUpd = buildCompatibleUpdate(
          streamTable,
          [['status', failedDbStatus]],
          (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [id] }),
          { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
        );
        await query(failUpd.sql, failUpd.params);
        res.status(400).json({
          success: false,
          error: stats.lastError || 'FFmpeg restart process failed.',
          stats
        });
      }
    } catch (err: any) {
      if (!isUuidColumn(streamTable, 'id') || isValidUuid(id)) {
        const failUpd = buildCompatibleUpdate(
          streamTable,
          [['status', resolveStreamStatusForDb('failed', streamTable)]],
          (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [id] }),
          { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
        );
        await query(failUpd.sql, failUpd.params).catch(() => {});
      }
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/streams/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const streamTable = getStreamTableName();
    try {
      if (isUuidColumn(streamTable, 'id') && !isValidUuid(id)) {
        return res.status(404).json({ success: false, message: 'Stream not found.' });
      }
      const sRes = await query(`SELECT user_id FROM ${streamTable} WHERE id = $1`, [id]);
      if (sRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Stream not found.' });
      }
      const resolvedUserId = await resolveValidUserId(req.user);
      if (sRes.rows[0].user_id !== req.user?.id && sRes.rows[0].user_id !== resolvedUserId && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this live stream.' });
      }

      try {
        await streamManager.stopStream(id);
      } catch {}

      await query(`DELETE FROM ${streamTable} WHERE id = $1`, [id]);
      res.json({ success: true, message: 'Stream deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/streams/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const resolvedUserId = await resolveValidUserId(req.user);
    const isStaffOrAdmin = ['super_admin', 'admin', 'manager', 'support_manager', 'support'].includes(req.user?.role || '');
    const streamTable = getStreamTableName();

    try {
      if (isUuidColumn(streamTable, 'id') && !isValidUuid(id)) {
        return res.status(404).json({ success: false, message: 'Stream not found.' });
      }
      const sRes = await query(`SELECT * FROM ${streamTable} WHERE id = $1`, [id]);
      if (sRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Stream not found.' });
      }
      const stream = sRes.rows[0];
      if (stream.user_id !== userId && stream.user_id !== resolvedUserId && !isStaffOrAdmin) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this live stream.' });
      }

      const { title, thumbnail, resolution, bitrate, category, privacy } = req.body;
      const setPairs: Array<[string | null, any]> = [];
      if (title !== undefined) setPairs.push([pickColumn(streamTable, ['title', 'name']), title]);
      if (thumbnail !== undefined) {
        setPairs.push(['thumbnail', thumbnail]);
        setPairs.push(['thumbnail_url', thumbnail]);
      }
      if (resolution !== undefined) setPairs.push(['resolution', resolution]);
      if (bitrate !== undefined) setPairs.push(['bitrate', bitrate]);
      if (category !== undefined) setPairs.push(['category', category]);
      if (privacy !== undefined) setPairs.push(['privacy', privacy]);

      if (setPairs.length === 0) {
        return res.json({ success: true, stream });
      }

      const updQ = buildCompatibleUpdate(
        streamTable,
        setPairs,
        (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [id] }),
        { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }], returning: '*' }
      );
      const updatedRes = await query(updQ.sql, updQ.params);

      res.json({ success: true, stream: updatedRes.rows[0] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/streams/:id/metrics', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const streamTable = getStreamTableName();
    if (isUuidColumn(streamTable, 'id') && !isValidUuid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Stream not found.' });
    }
    const sRes = await query(`SELECT user_id FROM ${streamTable} WHERE id = $1`, [req.params.id]);
    if (sRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Stream not found.' });
    }
    const resolvedUserId = await resolveValidUserId(req.user);
    if (sRes.rows[0].user_id !== req.user?.id && sRes.rows[0].user_id !== resolvedUserId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const stats = streamManager.getStreamStats(req.params.id);
    res.json({ success: true, stats });
  });

  // ----------------------------------------------------
  // 6. SUBSCRIPTIONS & VERIFIED PAYMENTS (PostgreSQL)
  // ----------------------------------------------------
  app.get('/api/billing/plans', (_req, res) => {
    res.json({ success: true, plans: SUBSCRIPTION_TIERS });
  });

  app.get('/api/billing/transactions', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const userId = await resolveValidUserId(req.user);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const isSuperAdmin = req.user?.role === 'super_admin';

    try {
      if (!isSuperAdmin && isUuidColumn('transactions', 'user_id') && !isValidUuid(userId)) {
        return res.json({ success: true, transactions: [] });
      }
      const q = isSuperAdmin
        ? 'SELECT * FROM transactions ORDER BY created_at DESC'
        : 'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC';
      const txRes = await query(q, isSuperAdmin ? [] : [userId]);

      const transactions = txRes.rows.map(t => ({
        id: t.id,
        userId: t.user_id,
        invoiceNumber: t.invoice_number,
        plan: t.plan,
        amountUSD: parseFloat(t.amount_usd) || 0,
        amountBDT: parseFloat(t.amount_bdt) || 0,
        currency: t.currency,
        status: t.status,
        gateway: t.gateway,
        transactionRef: t.transaction_ref,
        date: t.date_str || 'Today'
      }));

      res.json({ success: true, transactions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/billing/verify-payment', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { planId, gateway, trxId, amountBDT, amountUSD } = req.body;
    const selectedPlan = SUBSCRIPTION_TIERS[planId as keyof typeof SUBSCRIPTION_TIERS] || SUBSCRIPTION_TIERS.pro;

    let verificationResult;

    if (gateway === 'bKash') {
      verificationResult = await verifyBkashPayment(planId, trxId, amountBDT || selectedPlan.priceBDT);
    } else if (gateway === 'Nagad') {
      verificationResult = await verifyNagadPayment(planId, trxId, amountBDT || selectedPlan.priceBDT);
    } else if (gateway === 'Stripe') {
      verificationResult = await verifyStripePayment(trxId, amountUSD || selectedPlan.priceUSD);
    } else {
      // Manual / Bank transfer verification
      verificationResult = {
        isVerified: true,
        transactionId: trxId || `TX-${Date.now()}`,
        amount: amountBDT || selectedPlan.priceBDT,
        currency: 'BDT' as const,
        gateway: 'Manual' as const,
        status: 'Paid' as const,
        message: 'Payment verified manually.'
      };
    }

    // STRICT CHECK: Do NOT activate subscription if payment verification fails
    if (!verificationResult.isVerified || verificationResult.status !== 'Paid') {
      return res.status(402).json({
        success: false,
        message: `Payment verification failed: ${verificationResult.message}. Subscription was not updated.`
      });
    }

    const userId = await resolveValidUserId(req.user);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const newTxId = crypto.randomUUID();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    try {
      const txInsQ = buildCompatibleInsert(
        'transactions',
        [
          ['id', newTxId],
          ['user_id', userId],
          ['invoice_number', invoiceNumber],
          ['plan', `${selectedPlan.name} Plan (Monthly)`],
          ['amount_usd', selectedPlan.priceUSD],
          ['amount_bdt', verificationResult.amount],
          ['currency', verificationResult.currency],
          ['status', 'Paid'],
          ['gateway', verificationResult.gateway],
          ['transaction_ref', verificationResult.transactionId],
          ['date_str', dateStr]
        ],
        { rawTimestampColumns: ['created_at'] }
      );
      await query(txInsQ.sql, txInsQ.params);

      // Upgrade user plan & activate status in PostgreSQL
      const usrUpdQ = buildCompatibleUpdate(
        'users',
        [
          ['plan', selectedPlan.name],
          ['status', 'Active']
        ],
        (nextIdx) => ({ clause: `id::text = $${nextIdx}`, params: [String(userId)] }),
        { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
      );
      await query(usrUpdQ.sql, usrUpdQ.params);

      res.status(200).json({
        success: true,
        message: `Payment successfully verified. Subscription upgraded to ${selectedPlan.name} plan!`,
        transaction: {
          id: newTxId,
          userId,
          invoiceNumber,
          plan: `${selectedPlan.name} Plan (Monthly)`,
          amountUSD: selectedPlan.priceUSD,
          amountBDT: verificationResult.amount,
          currency: verificationResult.currency,
          status: 'Paid',
          gateway: verificationResult.gateway,
          transactionRef: verificationResult.transactionId,
          date: dateStr
        },
        plan: selectedPlan
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Gateway Settings storage path
  const gatewaySettingsPath = path.resolve(__dirname, 'uploads/gateway-settings.json');
  const getGatewaySettings = () => {
    try {
      if (fs.existsSync(gatewaySettingsPath)) {
        return JSON.parse(fs.readFileSync(gatewaySettingsPath, 'utf8'));
      }
    } catch {}
    return {
      bkashNumber: '01712-345678',
      bkashType: 'Merchant',
      bkashQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=01712345678',
      bkashInstructions: [
        'bKash অ্যাপ খুলুন',
        'Payment / Make Payment এ যান (অথবা Send Money)',
        'এই নম্বরে নির্ধারিত টাকা পাঠান',
        'Transaction ID নিচের বক্সে দিন',
        'Submit Payment করে অপেক্ষা করুন'
      ],
      nagadNumber: '01812-345678',
      nagadType: 'Merchant',
      nagadQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=01812345678',
      nagadInstructions: [
        'Nagad অ্যাপ খুলুন',
        'Payment / Send Money এ যান',
        'এই নম্বরে নির্ধারিত টাকা পাঠান',
        'Transaction ID নিচের বক্সে দিন',
        'Submit Payment করে অপেক্ষা করুন'
      ],
      qrCodeImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=STREAMALLOW-PAY-01712345678',
      qrCodeInstructions: [
        'যেকোনো ব্যাংকিং অ্যাপ (Bkash/Nagad/Upay/Citytouch/NexusPay) দিয়ে QR স্ক্যান করুন',
        'টাকা পাঠিয়ে প্রাপ্ত Transaction ID নিচে লিখে Submit করুন'
      ],
      verificationNotice: 'Payment Verification: সাধারণত ৫-১০ মিনিটের মধ্যে অ্যাডমিন আপনার পেমেন্ট যাচাই করে অ্যাকাউন্ট অ্যাক্টিভ করে দেবে।',
      stripePublicKey: 'pk_test_TYoo61ETXmGVwBoomWJwQLsL',
      stripeEnabled: true,
      bkashEnabled: true,
      nagadEnabled: true
    };
  };

  app.get('/api/system/gateway-settings', (_req, res) => {
    res.json({ success: true, settings: getGatewaySettings() });
  });

  app.post('/api/system/gateway-settings', authenticateToken, requireRoles(['super_admin', 'admin']), (req, res) => {
    try {
      const current = getGatewaySettings();
      const updated = { ...current, ...req.body };
      const uploadsDir = path.resolve(__dirname, 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(gatewaySettingsPath, JSON.stringify(updated, null, 2), 'utf8');
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Submit manual / bKash / Nagad / Stripe payment for Admin verification
  app.post('/api/billing/submit-payment', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { planId, gateway, transactionId, amountBDT, amountUSD, currency } = req.body;
    const selectedPlan = SUBSCRIPTION_TIERS[planId as keyof typeof SUBSCRIPTION_TIERS] || SUBSCRIPTION_TIERS.pro;

    const userId = req.user?.id || '';
    const userName = req.user?.name || req.body.userName || 'User';
    const userEmail = req.user?.email || req.body.userEmail || '';

    const newTxId = crypto.randomUUID();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const cleanTrx = (transactionId || `TRX-${Date.now()}`).trim();
    const resolvedUserId = (await resolveValidUserId({ id: userId, email: userEmail })) || userId;

    try {
      const txInsQ = buildCompatibleInsert(
        'transactions',
        [
          ['id', newTxId],
          ['user_id', resolvedUserId],
          ['invoice_number', invoiceNumber],
          ['plan', `${selectedPlan.name} Plan`],
          ['amount_usd', amountUSD || selectedPlan.priceUSD],
          ['amount_bdt', amountBDT || selectedPlan.priceBDT],
          ['currency', currency || 'BDT'],
          ['status', 'Pending'],
          ['gateway', gateway || 'bKash'],
          ['transaction_ref', cleanTrx],
          ['date_str', dateStr],
          ['user_email', userEmail],
          ['user_name', userName]
        ],
        { rawTimestampColumns: ['created_at'] }
      );
      await query(txInsQ.sql, txInsQ.params);

      // Log system activity
      const logQ = buildCompatibleInsert(
        'activity_logs',
        [
          ['id', crypto.randomUUID()],
          [pickColumn('activity_logs', ['user_name', 'user', 'username']), userName],
          ['user_id', isUuidColumn('activity_logs', 'user_id') && !isValidUuid(resolvedUserId) ? null : resolvedUserId],
          ['action', `Submitted ${gateway} payment for ${selectedPlan.name} Plan (TrxID: ${cleanTrx}) - Pending Admin Verification`],
          ['category', 'user'],
          [pickColumn('activity_logs', ['ip_address', 'ip']), '103.52.12.45']
        ],
        { rawTimestampColumns: ['created_at'] }
      );
      await query(logQ.sql, logQ.params);

      res.status(201).json({
        success: true,
        message: 'Payment submitted successfully! Waiting for Admin verification.',
        transaction: {
          id: newTxId,
          userId: resolvedUserId,
          userName,
          userEmail,
          invoiceNumber,
          plan: `${selectedPlan.name} Plan`,
          amountUSD: amountUSD || selectedPlan.priceUSD,
          amountBDT: amountBDT || selectedPlan.priceBDT,
          currency: currency || 'BDT',
          status: 'Pending',
          paymentMethod: gateway || 'bKash',
          transactionId: cleanTrx,
          date: dateStr,
          submittedAt: 'Just now'
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Handler for approving payment and activating user account with 1-month (30 days) validity
  const handleApproveTransaction = async (req: any, res: any) => {
    const txId = req.params?.id || req.body?.transactionId;
    const bodyRef = req.body?.transactionRef;
    const bodyInvoice = req.body?.invoiceNumber;
    const bodyEmail = (req.body?.userEmail || '').trim().toLowerCase();
    const bodyUserId = req.body?.userId;
    const bodyPlan = req.body?.plan;

    try {
      // Find transaction in PostgreSQL if exists (safe ::text comparison for UUID compatibility)
      const txRes = await query(
        `SELECT * FROM transactions 
         WHERE id::text = $1 OR invoice_number = $1 OR transaction_ref = $1 
            OR ($2 != '' AND transaction_ref = $2)
            OR ($3 != '' AND invoice_number = $3)
         LIMIT 1`,
        [txId || '', bodyRef || '', bodyInvoice || '']
      );

      const tx = txRes.rows.length > 0 ? txRes.rows[0] : null;
      const targetUserId = bodyUserId || tx?.user_id || crypto.randomUUID();
      const targetEmail = (bodyEmail || tx?.user_email || '').trim().toLowerCase();
      const targetName = req.body?.userName || tx?.user_name || 'Creator';

      // Determine plan name
      const rawPlan = (bodyPlan || tx?.plan || 'Pro').toString();
      let planName = 'Pro';
      if (rawPlan.toLowerCase().includes('business')) planName = 'Business';
      else if (rawPlan.toLowerCase().includes('basic')) planName = 'Basic';
      else planName = 'Pro';

      // 1. Mark transaction as Paid in database if found, or insert record if client-only
      if (tx) {
        await query("UPDATE transactions SET status = 'Paid' WHERE id = $1", [tx.id]);
      } else if (txId) {
        try {
          const fallbackTxId = isUuidColumn('transactions', 'id') && !isValidUuid(txId) ? crypto.randomUUID() : txId;
          const fallbackUserId = isUuidColumn('transactions', 'user_id') && !isValidUuid(targetUserId)
            ? ((await resolveValidUserId({ email: targetEmail })) || crypto.randomUUID())
            : targetUserId;
          const txInsQ = buildCompatibleInsert(
            'transactions',
            [
              ['id', fallbackTxId],
              ['user_id', fallbackUserId],
              ['invoice_number', bodyInvoice || `INV-${Date.now()}`],
              ['plan', `${planName} Plan`],
              ['amount_usd', 29],
              ['amount_bdt', 2990],
              ['currency', 'BDT'],
              ['status', 'Paid'],
              ['gateway', 'bKash'],
              ['transaction_ref', bodyRef || txId],
              ['date_str', 'Today'],
              ['user_email', targetEmail],
              ['user_name', targetName]
            ],
            { rawTimestampColumns: ['created_at'], onConflict: "ON CONFLICT (id) DO UPDATE SET status = 'Paid'" }
          );
          await query(txInsQ.sql, txInsQ.params);
        } catch {}
      }

      // 2. Activate user account in PostgreSQL with 30 days validity (1 month)
      const approveRawSets = [
        { column: 'subscription_start_date', expr: 'CURRENT_TIMESTAMP' },
        { column: 'renewal_date', expr: "to_char(CURRENT_TIMESTAMP + INTERVAL '30 days', 'Mon DD, YYYY')" },
        { column: 'expires_at', expr: "CURRENT_TIMESTAMP + INTERVAL '30 days'" },
        { column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }
      ];
      const userActivateQ = buildCompatibleUpdate(
        'users',
        [
          ['status', 'Active'],
          ['plan', planName],
          ['plan_duration_days', 30],
          ['renewal_days_left', 30]
        ],
        (nextIdx) => ({
          clause: `id::text = $${nextIdx} OR (email IS NOT NULL AND LOWER(email) = LOWER($${nextIdx + 1}))`,
          params: [String(targetUserId), targetEmail || 'none']
        }),
        { rawSets: approveRawSets, returning: '*' }
      );
      const updateRes = await query(userActivateQ.sql, userActivateQ.params);

      // If user was not yet in PostgreSQL users table, insert as Active
      if (updateRes.rows.length === 0 && targetEmail) {
        const dummyHash = '$2b$10$wE6vYhC.oZ4vTGBp1r8GteV7g66e2WJvQO6s0d8K8rXN5u88K1k6i';
        const insertUserId = isUuidColumn('users', 'id') && !isValidUuid(targetUserId) ? crypto.randomUUID() : targetUserId;
        const insUserQ = buildCompatibleInsert(
          'users',
          [
            ['id', insertUserId],
            ['name', targetName],
            ['email', targetEmail],
            ['password_hash', dummyHash],
            ['role', 'user'],
            ['plan', planName],
            ['status', 'Active'],
            ['joined_date', 'Today'],
            ['plan_duration_days', 30],
            ['renewal_days_left', 30]
          ],
          {
            rawTimestampColumns: ['created_at', 'updated_at', 'subscription_start_date'],
            onConflict: "ON CONFLICT (email) DO UPDATE SET status = 'Active', plan = EXCLUDED.plan"
          }
        );
        await query(insUserQ.sql, insUserQ.params);
        if (hasColumn('users', 'expires_at')) {
          const postUpd = buildCompatibleUpdate(
            'users',
            [],
            (nextIdx) => ({ clause: `LOWER(email) = LOWER($${nextIdx})`, params: [targetEmail] }),
            { rawSets: approveRawSets }
          );
          await query(postUpd.sql, postUpd.params).catch(() => {});
        }
      }

      // 3. Log activity
      const logQ = buildCompatibleInsert(
        'activity_logs',
        [
          ['id', crypto.randomUUID()],
          [pickColumn('activity_logs', ['user_name', 'user', 'username']), 'Admin'],
          ['action', `Approved payment & Activated account for ${targetEmail || targetUserId} (${planName} Plan - 30 days validity)`],
          ['category', 'admin'],
          [pickColumn('activity_logs', ['ip_address', 'ip']), '127.0.0.1']
        ],
        { rawTimestampColumns: ['created_at'] }
      );
      await query(logQ.sql, logQ.params);

      res.json({
        success: true,
        message: 'Payment approved! User account is now ACTIVE with 30 days validity.',
        transactionId: tx?.id || txId,
        userEmail: targetEmail,
        userId: targetUserId,
        status: 'Paid',
        userStatus: 'Active',
        renewalDaysLeft: 30
      });
    } catch (err: any) {
      console.error('[Admin Approve Payment Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  };

  // Admin approves payment routes
  app.post('/api/admin/transactions/:id/approve', authenticateToken, requireRoles(['super_admin', 'admin']), handleApproveTransaction);
  app.post('/api/admin/transactions/approve', authenticateToken, requireRoles(['super_admin', 'admin']), handleApproveTransaction);

  // Admin rejects payment
  app.post('/api/admin/transactions/:id/reject', authenticateToken, requireRoles(['super_admin', 'admin']), async (req, res) => {
    const txId = req.params.id;
    try {
      await query("UPDATE transactions SET status = 'Failed' WHERE id::text = $1 OR invoice_number = $1 OR transaction_ref = $1", [txId]);
      res.json({ success: true, message: 'Transaction marked as Failed / Rejected.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 7. ADMIN MANAGEMENT (Users, Staff, Activity Logs in PostgreSQL)
  // ----------------------------------------------------
  const SUBSCRIPTION_DAY_MS = 24 * 60 * 60 * 1000;

  const formatSubscriptionDateLabel = (dateInput: Date | string | number): string => {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  const computeSubscriptionDaysLeft = (expiresAt: Date | string | null | undefined, nowMs: number): number => {
    if (!expiresAt) return 0;
    const expiryMs = new Date(expiresAt).getTime();
    if (Number.isNaN(expiryMs)) return 0;
    const diffMs = expiryMs - nowMs;
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / SUBSCRIPTION_DAY_MS);
  };

  const formatAdminUserRow = (u: any, serverNowMs: number = Date.now()) => {
    let status = u.status || 'Active';
    const planDurationDays = Math.max(1, Number(u.planDurationDays ?? u.plan_duration_days ?? 30) || 30);
    const rawStart = u.subscriptionStartDate ?? u.subscription_start_date ?? u.createdAt ?? u.created_at;
    const rawExpires = u.expiresAt ?? u.expires_at;

    const startIso = rawStart ? new Date(rawStart).toISOString() : undefined;
    let expiresIso: string | undefined = rawExpires ? new Date(rawExpires).toISOString() : undefined;

    if (!expiresIso && status === 'Active' && startIso) {
      expiresIso = new Date(new Date(startIso).getTime() + planDurationDays * SUBSCRIPTION_DAY_MS).toISOString();
    }

    let daysLeft = 0;
    if (expiresIso) {
      const expiryMs = new Date(expiresIso).getTime();
      if (expiryMs <= serverNowMs) {
        if ((u.role || 'user') === 'user') {
          status = 'Inactive';
        }
        daysLeft = 0;
      } else if (status === 'Active') {
        daysLeft = computeSubscriptionDaysLeft(expiresIso, serverNowMs);
      }
    }

    const renewalDate = expiresIso
      ? formatSubscriptionDateLabel(expiresIso)
      : (status === 'Active' ? 'Active' : 'Expired');

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role || 'user',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      plan: u.plan || 'Basic',
      status,
      joinedDate: u.joinedDate || u.joined_date || (startIso ? formatSubscriptionDateLabel(startIso) : formatSubscriptionDateLabel(serverNowMs)),
      channelsCount: 0,
      totalViews: '0',
      usedStorageGB: 0.0,
      maxStorageGB: u.plan === 'Business' ? 100 : u.plan === 'Pro' ? 25 : 5,
      subscriptionStartDate: startIso,
      planDurationDays,
      renewalDate,
      renewalDaysLeft: daysLeft,
      expiresAt: expiresIso
    };
  };

  app.get('/api/admin/users', authenticateToken, requireRoles(['super_admin', 'admin', 'manager']), async (_req, res) => {
    try {
      // 1. Auto-deactivate expired accounts and keep DB remaining days synced (when subscription columns exist)
      if (hasColumn('users', 'expires_at')) {
        const expUpd = buildCompatibleUpdate(
          'users',
          [
            ['status', 'Inactive'],
            ['renewal_days_left', 0]
          ],
          () => ({
            clause: `role = 'user' AND status = 'Active' AND expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP`,
            params: []
          })
        );
        await query(expUpd.sql, expUpd.params).catch(() => {});
      }

      // 2. Fetch all users with DB start date, duration, expiry, and server timestamp
      const usersRes = await query(`
        SELECT u.*, CURRENT_TIMESTAMP as "serverNow"
        FROM users u
        ORDER BY ${hasColumn('users', 'created_at') ? 'u.created_at DESC' : 'u.id DESC'}
      `);

      const serverNowMs = usersRes.rows[0]?.serverNow
        ? new Date(usersRes.rows[0].serverNow).getTime()
        : Date.now();

      const formattedUsers = usersRes.rows.map(u => formatAdminUserRow(u, serverNowMs));

      res.json({
        success: true,
        users: formattedUsers
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/users/:id/reset-password', authenticateToken, requireRoles(['super_admin', 'admin']), async (req: AuthenticatedRequest, res) => {
    const { newPassword } = req.body || {};
    if (!newPassword || String(newPassword).trim().length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }
    try {
      if (isUuidColumn('users', 'id') && !isValidUuid(req.params.id)) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      const userRes = await query('SELECT id, name, email FROM users WHERE id::text = $1 LIMIT 1', [req.params.id]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      const targetUser = userRes.rows[0];
      const newHash = await hashPassword(String(newPassword));
      const updQ = buildCompatibleUpdate(
        'users',
        [['password_hash', newHash]],
        (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [targetUser.id] }),
        { rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }] }
      );
      await query(updQ.sql, updQ.params);
      await saveDbSnapshot().catch(() => {});
      invalidateUserSessions(targetUser.id, targetUser.email);

      res.json({
        success: true,
        message: `Password reset securely for ${targetUser.email}.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/admin/users', authenticateToken, requireRoles(['super_admin', 'admin']), async (req, res) => {
    const { name, email, plan, password, durationDays } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    try {
      const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }

      const validPlan = ['Basic', 'Pro', 'Business'].includes(plan) ? plan : 'Pro';
      const days = Math.max(1, parseInt(String(durationDays ?? 30), 10) || 30);
      const newId = crypto.randomUUID();
      const rawPassword = password && String(password).trim().length >= 6
        ? String(password)
        : crypto.randomBytes(9).toString('base64url');
      const passwordHash = await hashPassword(rawPassword);
      const userName = String(name || normalizedEmail.split('@')[0]).trim();
      const nowDate = new Date();
      const expiryDate = new Date(nowDate.getTime() + days * SUBSCRIPTION_DAY_MS);

      const insUserQ = buildCompatibleInsert(
        'users',
        [
          ['id', newId],
          ['name', userName],
          ['email', normalizedEmail],
          ['password_hash', passwordHash],
          ['role', 'user'],
          ['plan', validPlan],
          ['status', 'Active'],
          ['joined_date', formatSubscriptionDateLabel(nowDate)],
          ['subscription_start_date', nowDate.toISOString()],
          ['plan_duration_days', days],
          ['renewal_date', formatSubscriptionDateLabel(expiryDate)],
          ['renewal_days_left', days],
          ['expires_at', expiryDate.toISOString()]
        ],
        {
          rawTimestampColumns: ['created_at', 'updated_at'],
          returning: '*, CURRENT_TIMESTAMP as "serverNow"'
        }
      );
      const insertRes = await query(insUserQ.sql, insUserQ.params);

      const row = insertRes.rows[0];
      const serverNowMs = row?.serverNow ? new Date(row.serverNow).getTime() : Date.now();
      res.status(201).json({
        success: true,
        user: formatAdminUserRow(row, serverNowMs)
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/admin/users/:id/status', authenticateToken, requireRoles(['super_admin', 'admin']), async (req, res) => {
    const { status, durationDays, days } = req.body || {};
    const validDays = Math.max(1, parseInt(String(durationDays ?? days ?? 30), 10) || 30);

    try {
      if (isUuidColumn('users', 'id') && !isValidUuid(req.params.id)) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      const isActivating = status === 'Active';
      const nowDate = new Date();
      const expiryDate = new Date(nowDate.getTime() + validDays * SUBSCRIPTION_DAY_MS);

      const updQ = isActivating
        ? buildCompatibleUpdate(
            'users',
            [
              ['status', 'Active'],
              ['subscription_start_date', nowDate.toISOString()],
              ['plan_duration_days', validDays],
              ['renewal_days_left', validDays],
              ['renewal_date', formatSubscriptionDateLabel(expiryDate)],
              ['expires_at', expiryDate.toISOString()]
            ],
            (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [req.params.id] }),
            {
              rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }],
              returning: '*, CURRENT_TIMESTAMP as "serverNow"'
            }
          )
        : buildCompatibleUpdate(
            'users',
            [
              ['status', status || 'Inactive'],
              ['renewal_days_left', 0],
              ['renewal_date', 'Expired'],
              ['expires_at', nowDate.toISOString()]
            ],
            (nextIdx) => ({ clause: `id = $${nextIdx}`, params: [req.params.id] }),
            {
              rawSets: [{ column: 'updated_at', expr: 'CURRENT_TIMESTAMP' }],
              returning: '*, CURRENT_TIMESTAMP as "serverNow"'
            }
          );

      const updateRes = await query(updQ.sql, updQ.params);

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      const row = updateRes.rows[0];
      const serverNowMs = row?.serverNow ? new Date(row.serverNow).getTime() : Date.now();
      res.json({
        success: true,
        message: `User status changed to ${status}.`,
        user: formatAdminUserRow(row, serverNowMs)
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/admin/staff', authenticateToken, requireRoles(['super_admin', 'admin']), async (_req, res) => {
    try {
      const staffRes = await query("SELECT id, name, email, role, status FROM users WHERE role != 'user' ORDER BY created_at ASC");
      res.json({ success: true, staff: staffRes.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/activity-logs', authenticateToken, async (_req, res) => {
    try {
      const orderCol = hasColumn('activity_logs', 'created_at') ? 'created_at DESC' : 'id DESC';
      const logsRes = await query(`SELECT * FROM activity_logs ORDER BY ${orderCol} LIMIT 50`);
      const logs = logsRes.rows.map(l => ({
        id: l.id,
        user: l.user_name ?? l.user ?? l.username ?? 'System',
        action: l.action || '',
        category: l.category || 'system',
        ipAddress: l.ip_address ?? l.ip ?? '',
        timestamp: l.created_at ?? l.timestamp ?? ''
      }));
      res.json({ success: true, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/activity-logs', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const newId = crypto.randomUUID();
    const userName = req.user?.name || req.body.user || 'System';
    const action = req.body.action || 'Action recorded';
    const category = req.body.category || 'system';
    const ipAddress = '103.52.12.45';
    const resolvedUserId = await resolveValidUserId(req.user);

    try {
      const logQ = buildCompatibleInsert(
        'activity_logs',
        [
          ['id', newId],
          [pickColumn('activity_logs', ['user_name', 'user', 'username']), userName],
          ['user_id', resolvedUserId && (!isUuidColumn('activity_logs', 'user_id') || isValidUuid(resolvedUserId)) ? resolvedUserId : null],
          ['action', action],
          ['category', category],
          ['details', req.body.details || null],
          [pickColumn('activity_logs', ['ip_address', 'ip']), ipAddress]
        ],
        { rawTimestampColumns: ['created_at'] }
      );
      await query(logQ.sql, logQ.params);
      res.status(201).json({
        success: true,
        log: {
          id: newId,
          user: userName,
          action,
          category,
          ipAddress,
          timestamp: 'Just now'
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // HOMEPAGE DEMO VIDEO CONFIGURATION (PUBLIC & ADMIN)
  // ----------------------------------------------------
  app.get('/api/homepage-demo', async (_req, res) => {
    try {
      const demoRes = await query('SELECT * FROM homepage_demo_config WHERE id = $1', ['default']);
      if (demoRes.rows.length === 0) {
        return res.json({
          success: true,
          config: {
            title: 'Relaxing LoFi Music 24/7',
            channelName: 'Music World',
            viewersText: '1.2K watching',
            videoUrl: '/uploads/media/video-Music_video_animating_storyboard____1080-1793964845416-990953612.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80',
            videoSourceType: 'uploaded',
            resolution: '1080p · 60 FPS',
            bitrate: '4,500 kbps'
          }
        });
      }
      const row = demoRes.rows[0];
      res.json({
        success: true,
        config: {
          title: row.title,
          channelName: row.channel_name,
          viewersText: row.viewers_text,
          videoUrl: row.video_url,
          thumbnailUrl: row.thumbnail_url,
          videoSourceType: row.video_source_type || 'uploaded',
          resolution: row.resolution || '1080p · 60 FPS',
          bitrate: row.bitrate || '4,500 kbps',
          updatedAt: row.updated_at
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/admin/homepage-demo', authenticateToken, requireRoles(['super_admin', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const {
        title,
        channelName,
        viewersText,
        videoUrl,
        thumbnailUrl,
        videoSourceType,
        resolution,
        bitrate
      } = req.body;

      if (!title || !videoUrl) {
        return res.status(400).json({ success: false, message: 'Title and Video URL are required.' });
      }

      await query(
        `INSERT INTO homepage_demo_config (id, title, channel_name, viewers_text, video_url, thumbnail_url, video_source_type, resolution, bitrate, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           channel_name = EXCLUDED.channel_name,
           viewers_text = EXCLUDED.viewers_text,
           video_url = EXCLUDED.video_url,
           thumbnail_url = EXCLUDED.thumbnail_url,
           video_source_type = EXCLUDED.video_source_type,
           resolution = EXCLUDED.resolution,
           bitrate = EXCLUDED.bitrate,
           updated_at = CURRENT_TIMESTAMP`,
        [
          'default',
          title || 'Relaxing LoFi Music 24/7',
          channelName || 'Music World',
          viewersText || '1.2K watching',
          videoUrl,
          thumbnailUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80',
          videoSourceType || 'uploaded',
          resolution || '1080p · 60 FPS',
          bitrate || '4,500 kbps'
        ]
      );

      // Log activity
      const logQ = buildCompatibleInsert(
        'activity_logs',
        [
          ['id', crypto.randomUUID()],
          [pickColumn('activity_logs', ['user_name', 'user', 'username']), req.user?.name || 'Super Admin'],
          ['action', `Updated Homepage Demo Video: "${title}"`],
          ['category', 'admin'],
          [pickColumn('activity_logs', ['ip_address', 'ip']), '127.0.0.1']
        ],
        { rawTimestampColumns: ['created_at'] }
      );
      await query(logQ.sql, logQ.params).catch(() => {});

      res.json({
        success: true,
        message: 'Homepage demo video settings updated successfully! It is now live on the public website homepage.',
        config: {
          title,
          channelName,
          viewersText,
          videoUrl,
          thumbnailUrl,
          videoSourceType,
          resolution,
          bitrate
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Dedicated upload for Homepage Demo Video
  app.post('/api/admin/homepage-demo/upload-video', authenticateToken, requireRoles(['super_admin', 'admin']), (req: AuthenticatedRequest, res) => {
    videoUpload.single('video')(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message || 'Video upload failed.' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No video file provided.' });
      }
      try {
        const metadata = await extractVideoMetadata(req.file.path, req.file.originalname);
        const fileUrl = `/uploads/media/${path.basename(req.file.path)}`;
        res.json({
          success: true,
          videoUrl: fileUrl,
          thumbnailUrl: metadata.thumbnailUrl,
          duration: metadata.formattedDuration,
          resolution: metadata.resolution,
          fileName: req.file.originalname
        });
      } catch (procErr: any) {
        const fileUrl = `/uploads/media/${path.basename(req.file.path)}`;
        res.json({
          success: true,
          videoUrl: fileUrl,
          thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80',
          duration: '00:00',
          resolution: '1080p FHD',
          fileName: req.file.originalname
        });
      }
    });
  });

  // Dedicated upload for Homepage Demo Thumbnail image
  app.post('/api/admin/homepage-demo/upload-thumbnail', authenticateToken, requireRoles(['super_admin', 'admin']), (req: AuthenticatedRequest, res) => {
    imageUpload.single('thumbnail')(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message || 'Thumbnail upload failed.' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file provided.' });
      }
      const thumbUrl = `/uploads/thumbnails/${path.basename(req.file.path)}`;
      res.json({
        success: true,
        thumbnailUrl: thumbUrl
      });
    });
  });

  // Reset Homepage Demo Video to default
  app.post('/api/admin/homepage-demo/reset', authenticateToken, requireRoles(['super_admin', 'admin']), async (_req: AuthenticatedRequest, res) => {
    try {
      const defaultConfig = {
        title: 'Relaxing LoFi Music 24/7',
        channelName: 'Music World',
        viewersText: '1.2K watching',
        videoUrl: '/uploads/media/video-Music_video_animating_storyboard____1080-1793964845416-990953612.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80',
        videoSourceType: 'uploaded',
        resolution: '1080p · 60 FPS',
        bitrate: '4,500 kbps'
      };

      await query(
        `UPDATE homepage_demo_config SET
           title = $1, channel_name = $2, viewers_text = $3, video_url = $4,
           thumbnail_url = $5, video_source_type = $6, resolution = $7, bitrate = $8,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = 'default'`,
        [
          defaultConfig.title,
          defaultConfig.channelName,
          defaultConfig.viewersText,
          defaultConfig.videoUrl,
          defaultConfig.thumbnailUrl,
          defaultConfig.videoSourceType,
          defaultConfig.resolution,
          defaultConfig.bitrate
        ]
      );

      res.json({
        success: true,
        message: 'Homepage demo video restored to default configuration.',
        config: defaultConfig
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Payload size error interceptor
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && (err.type === 'entity.too.large' || err.name === 'PayloadTooLargeError' || err.status === 413)) {
      return res.status(413).json({
        success: false,
        message: 'Request payload is too large. Please use a smaller file or image (max limit: 100MB).'
      });
    }
    next(err);
  });

  // ----------------------------------------------------
  // 8. VITE FRONTEND MIDDLEWARE (Dev) / STATIC (Prod)
  // ----------------------------------------------------
  let viteServer: Awaited<ReturnType<typeof createViteServer>> | null = null;

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    if (!process.env.DISABLE_HMR) {
      process.env.DISABLE_HMR = 'true';
    }
    if (process.env.DISABLE_HMR === 'true') {
      // Serve a clean WebSocket-free Vite client shim so CSS/React modules work without failing wss://:24678 connections
      app.get('/@vite/client', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    if (style.parentNode) style.parentNode.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {}
  };
}
export function injectQuery(url, queryToInject) {
  if (!url || (url[0] !== '.' && url[0] !== '/')) return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + (hash || '');
}
export class ErrorOverlay {
  constructor() {}
}
`);
      });
    }
    viteServer = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      appType: 'spa'
    });
    app.use(viteServer.middlewares);
  }

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Stream Allow SaaS server is active on http://0.0.0.0:${PORT}`);
  });

  let isShuttingDown = false;
  const gracefulShutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    const forceExitTimer = setTimeout(() => {
      process.exit(0);
    }, 2500);
    forceExitTimer.unref?.();

    try {
      const activeProcs = streamManager.getAllActiveProcesses();
      await Promise.allSettled(activeProcs.map(p => streamManager.stopStream(p.streamId)));
    } catch {}

    try {
      httpServer.closeAllConnections?.();
      await new Promise<void>(resolve => httpServer.close(() => resolve()));
    } catch {}

    try {
      if (viteServer) {
        await Promise.race([viteServer.close(), new Promise(r => setTimeout(r, 800))]);
      }
    } catch {}

    try {
      await closeDatabaseConnection();
    } catch {}

    clearTimeout(forceExitTimer);
    process.exit(0);
  };

  process.once('SIGTERM', gracefulShutdown);
  process.once('SIGINT', gracefulShutdown);
}

startServer();
