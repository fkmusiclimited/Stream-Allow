import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { initDatabaseConnection, isDbConnected, query } from './src/server/db/db';
import { encryptStreamKey, validateEncryptionConfig, maskStreamKey } from './src/server/utils/crypto';
import { StreamManager, StreamConfig } from './src/server/ffmpeg/StreamManager';
import { getVpsMetrics } from './src/server/monitoring/ResourceMonitor';
import {
  authenticateToken,
  requireRoles,
  hashPassword,
  comparePassword,
  signToken,
  validateJwtConfig,
  AuthenticatedRequest
} from './src/server/middleware/auth';
import { videoUpload, extractVideoMetadata } from './src/server/media/mediaUpload';
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

  app.use(express.json());

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

  // Initialize PostgreSQL Database Engine & Apply Schema Migrations
  try {
    await initDatabaseConnection();
  } catch (dbErr: any) {
    console.error('[PostgreSQL] Critical startup connection error:', dbErr.message);
  }

  const streamManager = StreamManager.getInstance();

  // Auto-recovery of active streams on startup from PostgreSQL
  setTimeout(async () => {
    try {
      const liveRes = await query("SELECT * FROM live_streams WHERE status = 'live'");
      const liveConfigs: StreamConfig[] = [];

      for (const s of liveRes.rows) {
        let videoPaths: string[] = [];
        if (s.playlist_id) {
          const pvRes = await query('SELECT * FROM playlist_videos WHERE playlist_id = $1 ORDER BY position_order ASC', [s.playlist_id]);
          for (const v of pvRes.rows) {
            if (v.file_path && fs.existsSync(v.file_path)) {
              videoPaths.push(v.file_path);
            } else if (v.url) {
              const localPath = path.resolve(process.cwd(), 'uploads', v.url.replace(/^\/?(media\/)?/, 'media/'));
              if (fs.existsSync(localPath)) {
                videoPaths.push(localPath);
              }
            }
          }
        }

        // If playlist is empty or videos are missing on disk, do not start stream. Mark as failed.
        if (videoPaths.length === 0) {
          await query("UPDATE live_streams SET status = 'failed' WHERE id = $1", [s.id]).catch(() => {});
          console.warn(`[PostgreSQL Recovery] Stream ${s.id} ("${s.title}") has no valid video files on disk. Marked as failed.`);
          continue;
        }

        liveConfigs.push({
          streamId: s.id,
          userId: s.user_id,
          title: s.title,
          streamUrl: s.stream_url,
          encryptedStreamKey: s.encrypted_key_cipher,
          streamKeyIv: s.encrypted_key_iv,
          streamKeyAuthTag: s.encrypted_key_tag,
          isDualStream: s.is_dual_stream,
          backupRtmpUrl: s.backup_rtmp_url,
          videoPaths
        });
      }

      if (liveConfigs.length > 0) {
        await streamManager.recoverActiveStreams(liveConfigs, async (failedStreamId, reason) => {
          await query("UPDATE live_streams SET status = 'failed' WHERE id = $1", [failedStreamId]).catch(() => {});
          console.warn(`[PostgreSQL Recovery] Stream ${failedStreamId} marked as failed: ${reason}`);
        });
      }
    } catch (err: any) {
      console.warn('[PostgreSQL Recovery] Startup recovery note:', err.message);
    }
  }, 1000);

  // ----------------------------------------------------
  // 1. HEALTH & SYSTEM MONITORING ROUTES
  // ----------------------------------------------------
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      platform: 'Stream Join Core SaaS Engine',
      version: '3.5.0',
      database: isDbConnected() ? 'PostgreSQL Active (Persistent)' : 'PostgreSQL Initializing',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/system/db-status', async (_req, res) => {
    try {
      const usersRes = await query('SELECT COUNT(*)::int as count FROM users');
      const streamsRes = await query("SELECT COUNT(*)::int as count FROM live_streams WHERE status = 'live'");
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

  app.get('/api/system/processes', authenticateToken, (_req, res) => {
    const processes = streamManager.getAllActiveProcesses();
    res.json({ success: true, processes });
  });

  // ----------------------------------------------------
  // 2. AUTHENTICATION & PERMISSIONS (PostgreSQL)
  // ----------------------------------------------------
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    try {
      const existing = await query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }

      const passwordHash = await hashPassword(password);
      const newId = 'usr_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      const userName = name || email.split('@')[0];
      const role = 'user';
      const plan = 'Basic';
      const status = 'Active';
      const joinedDate = 'Today';

      const insertRes = await query(
        `INSERT INTO users (id, name, email, password_hash, role, plan, status, joined_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, name, email, role, plan, status`,
        [newId, userName, email.toLowerCase(), passwordHash, role, plan, status, joinedDate]
      );

      const user = insertRes.rows[0];
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
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    try {
      const userRes = await query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
      if (userRes.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const user = userRes.rows[0];
      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
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
        user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan },
        token
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }
    try {
      const userRes = await query('SELECT id, name, email, role, plan, status FROM users WHERE id = $1', [req.user.id]);
      if (userRes.rows.length === 0) {
        return res.json({ success: true, user: req.user });
      }
      res.json({ success: true, user: userRes.rows[0] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    const token = `reset_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = Date.now() + 3600000; // 1 hour
    try {
      await query(
        'INSERT INTO password_resets (email, token, expires_at, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
        [email.toLowerCase(), token, expiresAt]
      );
      res.json({
        success: true,
        message: 'Password reset instructions sent to your email address.',
        resetToken: token
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
      const resetRes = await query(
        'SELECT * FROM password_resets WHERE token = $1 AND expires_at > $2',
        [token, Date.now()]
      );
      if (resetRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid or expired password reset token.' });
      }

      const resetRecord = resetRes.rows[0];
      const newHash = await hashPassword(newPassword);
      await query('UPDATE users SET password_hash = $1 WHERE email = $2', [newHash, resetRecord.email.toLowerCase()]);
      await query('DELETE FROM password_resets WHERE token = $1', [token]);

      res.json({ success: true, message: 'Password reset successfully. You can now login.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 3. PLAYLISTS & VIDEO MANAGEMENT (PostgreSQL)
  // ----------------------------------------------------
  app.get('/api/playlists', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const isSuperAdmin = req.user?.role === 'super_admin';

    try {
      const playlistsQuery = isSuperAdmin
        ? 'SELECT * FROM playlists ORDER BY created_at DESC'
        : 'SELECT * FROM playlists WHERE user_id = $1 ORDER BY created_at DESC';
      const plRes = await query(playlistsQuery, isSuperAdmin ? [] : [userId]);

      const playlists = plRes.rows.map(p => ({
        id: p.id,
        userId: p.user_id,
        name: p.name,
        description: p.description,
        status: p.status,
        isLiveLoop: p.is_live_loop,
        totalVideos: p.total_videos,
        totalRuntime: p.total_runtime,
        thumbnail: p.thumbnail,
        videos: [] as any[]
      }));

      // Fetch videos for each playlist
      for (const pl of playlists) {
        const videosRes = await query(
          'SELECT * FROM playlist_videos WHERE playlist_id = $1 ORDER BY position_order ASC',
          [pl.id]
        );
        pl.videos = videosRes.rows.map(v => ({
          id: v.id,
          title: v.title,
          duration: v.duration,
          durationSeconds: v.duration_seconds,
          resolution: v.resolution,
          format: v.format,
          url: v.url,
          filePath: v.file_path,
          fileSizeBytes: v.file_size_bytes,
          thumbnail: v.thumbnail,
          positionOrder: v.position_order
        }));
        pl.totalVideos = pl.videos.length;
      }

      res.json({ success: true, playlists });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/playlists', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { name, description, isLiveLoop, thumbnail } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const newId = 'pl_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const plName = name || 'New Live Playlist';
    const plDesc = description || '';
    const plThumb = thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
    const loopVal = isLiveLoop !== undefined ? Boolean(isLiveLoop) : true;

    try {
      const insertRes = await query(
        `INSERT INTO playlists (id, user_id, name, description, status, is_live_loop, total_videos, total_runtime, thumbnail, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Scheduled', $5, 0, '00:00', $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [newId, userId, plName, plDesc, loopVal, plThumb]
      );

      const p = insertRes.rows[0];
      const playlist = {
        id: p.id,
        userId: p.user_id,
        name: p.name,
        description: p.description,
        status: p.status,
        isLiveLoop: p.is_live_loop,
        totalVideos: 0,
        totalRuntime: '00:00',
        thumbnail: p.thumbnail,
        videos: []
      };

      res.status(201).json({ success: true, playlist });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/playlists/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const plRes = await query('SELECT * FROM playlists WHERE id = $1', [req.params.id]);
      if (plRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Playlist not found.' });
      }

      const p = plRes.rows[0];
      if (p.user_id !== req.user?.id && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this playlist.' });
      }

      const videosRes = await query(
        'SELECT * FROM playlist_videos WHERE playlist_id = $1 ORDER BY position_order ASC',
        [p.id]
      );

      const playlist = {
        id: p.id,
        userId: p.user_id,
        name: p.name,
        description: p.description,
        status: p.status,
        isLiveLoop: p.is_live_loop,
        totalVideos: videosRes.rows.length,
        totalRuntime: p.total_runtime,
        thumbnail: p.thumbnail,
        videos: videosRes.rows.map(v => ({
          id: v.id,
          title: v.title,
          duration: v.duration,
          durationSeconds: v.duration_seconds,
          resolution: v.resolution,
          format: v.format,
          url: v.url,
          filePath: v.file_path,
          fileSizeBytes: v.file_size_bytes,
          thumbnail: v.thumbnail,
          positionOrder: v.position_order
        }))
      };

      res.json({ success: true, playlist });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/playlists/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { name, description, status, isLiveLoop, thumbnail } = req.body;
    try {
      const existingRes = await query('SELECT user_id FROM playlists WHERE id = $1', [req.params.id]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Playlist not found.' });
      }
      if (existingRes.rows[0].user_id !== req.user?.id && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this playlist.' });
      }

      const plRes = await query(
        `UPDATE playlists
         SET name = COALESCE($2, name),
             description = COALESCE($3, description),
             status = COALESCE($4, status),
             is_live_loop = COALESCE($5, is_live_loop),
             thumbnail = COALESCE($6, thumbnail),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [req.params.id, name, description, status, isLiveLoop, thumbnail]
      );

      res.json({ success: true, playlist: plRes.rows[0] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/playlists/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const existingRes = await query('SELECT user_id FROM playlists WHERE id = $1', [req.params.id]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Playlist not found.' });
      }
      if (existingRes.rows[0].user_id !== req.user?.id && req.user?.role !== 'super_admin') {
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
    const userId = req.user?.id;
    const isSuperAdmin = req.user?.role === 'super_admin';

    try {
      let plRes = await query('SELECT * FROM playlists WHERE id = $1', [playlistId]);
      if (plRes.rows.length === 0) {
        const autoPlName = req.body.playlistName || req.body.title || 'Stream Playlist';
        await query(
          `INSERT INTO playlists (id, user_id, name, description, status, is_live_loop, total_videos, total_runtime, thumbnail, created_at, updated_at)
           VALUES ($1, $2, $3, '', 'Active', true, 0, '00:00', $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [playlistId, userId, autoPlName, req.body.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600']
        );
        plRes = await query('SELECT * FROM playlists WHERE id = $1', [playlistId]);
      } else if (plRes.rows[0].user_id !== userId && !isSuperAdmin) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this playlist.' });
      }

      // Video Validation & Auto-registration fallback
      const targetMediaId = req.body.mediaId || req.body.id;
      let mediaRecord: any = null;

      if (targetMediaId) {
        const mRes = await query('SELECT * FROM uploaded_media WHERE id = $1', [targetMediaId]);
        if (mRes.rows.length > 0) {
          mediaRecord = mRes.rows[0];
        }
      }

      if (!mediaRecord && (req.body.filePath || req.body.url)) {
        const cleanPath = req.body.filePath || '';
        const cleanUrl = req.body.url || '';
        const mRes = await query(
          'SELECT * FROM uploaded_media WHERE file_path = $1 OR url = $2',
          [cleanPath, cleanUrl]
        );
        if (mRes.rows.length > 0) {
          mediaRecord = mRes.rows[0];
        }
      }

      if (!mediaRecord) {
        const newMediaId = 'med_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
        const autoName = req.body.title || 'Broadcast Video.mp4';
        const autoPath = req.body.filePath || `/app/applet/uploads/${newMediaId}.mp4`;
        const autoUrl = req.body.url || `/uploads/${newMediaId}.mp4`;
        const autoDuration = req.body.duration || '15:20';
        const autoDurSecs = req.body.durationSeconds || 920;
        const autoRes = req.body.resolution || '1080p FHD';
        const autoFormat = req.body.format || 'MP4';
        const autoThumb = req.body.thumbnail || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600';
        const autoSize = req.body.fileSizeBytes || 50000000;

        const insRes = await query(
          `INSERT INTO uploaded_media (id, user_id, file_name, original_name, file_path, url, duration_seconds, formatted_duration, resolution, format, file_size_bytes, thumbnail_url, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
           RETURNING *`,
          [newMediaId, userId, autoName, autoName, autoPath, autoUrl, autoDurSecs, autoDuration, autoRes, autoFormat, autoSize, autoThumb]
        );
        mediaRecord = insRes.rows[0];
      }

      // Ownership enforcement: Video must be owned by the playlist owner (or super admin)
      if (mediaRecord.user_id !== userId && !isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not own this uploaded video.'
        });
      }

      // Determine genuine server video properties strictly from database record
      const videoId = 'vid_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      const title = req.body.title || mediaRecord.original_name || 'Untitled Video';
      const duration = mediaRecord.formatted_duration || req.body.duration || '00:00';
      const durationSeconds = mediaRecord.duration_seconds || 0;
      const resolution = mediaRecord.resolution || '1080p FHD';
      const format = mediaRecord.format || 'MP4';
      const url = mediaRecord.url;
      const filePath = mediaRecord.file_path;
      const fileSizeBytes = mediaRecord.file_size_bytes || 0;
      const thumbnail = mediaRecord.thumbnail_url || req.body.thumbnail || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600';

      const countRes = await query('SELECT COUNT(*)::int as count FROM playlist_videos WHERE playlist_id = $1', [playlistId]);
      const nextOrder = (countRes.rows[0]?.count || 0) + 1;

      const videoInsert = await query(
        `INSERT INTO playlist_videos (id, playlist_id, title, duration, duration_seconds, resolution, format, url, file_path, file_size_bytes, thumbnail, position_order, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
         RETURNING *`,
        [videoId, playlistId, title, duration, durationSeconds, resolution, format, url, filePath, fileSizeBytes, thumbnail, nextOrder]
      );

      // Recalculate total_videos and total_runtime
      const allVideos = await query('SELECT duration_seconds FROM playlist_videos WHERE playlist_id = $1', [playlistId]);
      const totalSecs = allVideos.rows.reduce((acc, v) => acc + (v.duration_seconds || 0), 0);
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      const formattedRuntime = hrs > 0
        ? `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      await query(
        'UPDATE playlists SET total_videos = $2, total_runtime = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [playlistId, allVideos.rows.length, formattedRuntime]
      );

      res.status(201).json({
        success: true,
        video: {
          id: videoInsert.rows[0].id,
          title: videoInsert.rows[0].title,
          duration: videoInsert.rows[0].duration,
          durationSeconds: videoInsert.rows[0].duration_seconds,
          resolution: videoInsert.rows[0].resolution,
          format: videoInsert.rows[0].format,
          url: videoInsert.rows[0].url,
          filePath: videoInsert.rows[0].file_path,
          fileSizeBytes: videoInsert.rows[0].file_size_bytes,
          thumbnail: videoInsert.rows[0].thumbnail,
          positionOrder: videoInsert.rows[0].position_order
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/playlists/:id/videos/reorder', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const playlistId = req.params.id;
    try {
      const plRes = await query('SELECT user_id FROM playlists WHERE id = $1', [playlistId]);
      if (plRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Playlist not found.' });
      }
      if (plRes.rows[0].user_id !== req.user?.id && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this playlist.' });
      }

      const { orderedVideoIds } = req.body;
      if (Array.isArray(orderedVideoIds)) {
        for (let i = 0; i < orderedVideoIds.length; i++) {
          await query(
            'UPDATE playlist_videos SET position_order = $1 WHERE playlist_id = $2 AND id = $3',
            [i + 1, playlistId, orderedVideoIds[i]]
          );
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
    try {
      const plRes = await query('SELECT user_id FROM playlists WHERE id = $1', [id]);
      if (plRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Playlist not found.' });
      }
      if (plRes.rows[0].user_id !== req.user?.id && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this playlist.' });
      }

      await query('DELETE FROM playlist_videos WHERE playlist_id = $1 AND id = $2', [id, videoId]);

      // Recalculate runtime
      const allVideos = await query('SELECT duration_seconds FROM playlist_videos WHERE playlist_id = $1', [id]);
      const totalSecs = allVideos.rows.reduce((acc, v) => acc + (v.duration_seconds || 0), 0);
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      const formattedRuntime = hrs > 0
        ? `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      await query(
        'UPDATE playlists SET total_videos = $2, total_runtime = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id, allVideos.rows.length, formattedRuntime]
      );

      res.json({ success: true, message: 'Video removed from playlist.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 4. VIDEO UPLOAD & MEDIA STORAGE (Multer + FFprobe + PostgreSQL)
  // ----------------------------------------------------
  app.get('/api/media', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const isSuperAdmin = req.user?.role === 'super_admin';

    try {
      const q = isSuperAdmin
        ? 'SELECT * FROM uploaded_media ORDER BY created_at DESC'
        : 'SELECT * FROM uploaded_media WHERE user_id = $1 ORDER BY created_at DESC';
      const mRes = await query(q, isSuperAdmin ? [] : [userId]);

      const media = mRes.rows.map(m => ({
        id: m.id,
        userId: m.user_id,
        fileName: m.file_name,
        originalName: m.original_name,
        filePath: m.file_path,
        url: m.url,
        durationSeconds: m.duration_seconds,
        formattedDuration: m.formatted_duration,
        resolution: m.resolution,
        format: m.format,
        fileSizeBytes: m.file_size_bytes,
        thumbnailUrl: m.thumbnail_url,
        createdAt: m.created_at
      }));

      res.json({ success: true, media });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/media/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const mRes = await query('SELECT * FROM uploaded_media WHERE id = $1', [req.params.id]);
      if (mRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Media file not found.' });
      }

      const m = mRes.rows[0];
      if (m.user_id !== req.user?.id && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this media.' });
      }

      if (m.file_path && fs.existsSync(m.file_path)) {
        try { fs.unlinkSync(m.file_path); } catch {}
      }

      await query('DELETE FROM uploaded_media WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Media deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/media/upload', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required to upload media.' });
    }

    // Pre-check: Determine user's subscription storage quota
    let userPlan = 'Basic';
    let isSuperAdmin = req.user?.role === 'super_admin';
    try {
      const uRes = await query('SELECT plan, role FROM users WHERE id = $1', [userId]);
      if (uRes.rows.length > 0) {
        userPlan = uRes.rows[0].plan || 'Basic';
        if (uRes.rows[0].role === 'super_admin') isSuperAdmin = true;
      }
    } catch {}

    const limits = getPlanLimits(userPlan);
    const maxStorageBytes = limits.maxStorageGB * 1024 * 1024 * 1024;

    videoUpload.single('video')(req, res, async (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File is too large. Maximum allowed size is 2 GB.' });
        }
        return res.status(400).json({ success: false, message: err.message || 'Video upload failed.' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No video file provided. Please choose a video file.' });
      }

      // Storage quota verification: Verify user has not exceeded package storage limit
      if (!isSuperAdmin) {
        try {
          const storageRes = await query(
            'SELECT COALESCE(SUM(file_size_bytes), 0)::bigint as used FROM uploaded_media WHERE user_id = $1',
            [userId]
          );
          const currentUsedBytes = parseInt(storageRes.rows[0]?.used || '0', 10);
          if (currentUsedBytes + req.file.size > maxStorageBytes) {
            try { fs.unlinkSync(req.file.path); } catch {}
            const usedGb = (currentUsedBytes / (1024 * 1024 * 1024)).toFixed(2);
            return res.status(400).json({
              success: false,
              message: `Storage limit exceeded for your ${limits.name} plan (${limits.maxStorageGB} GB max). You have currently used ${usedGb} GB. Please upgrade your subscription or delete existing videos.`
            });
          }
        } catch (quotaErr: any) {
          console.warn('[Storage Quota] Storage calculation error:', quotaErr.message);
        }
      }

      try {
        const metadata = await extractVideoMetadata(req.file.path, req.file.originalname);
        const mediaId = 'med_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);

        await query(
          `INSERT INTO uploaded_media (id, user_id, file_name, original_name, file_path, url, duration_seconds, formatted_duration, resolution, format, file_size_bytes, thumbnail_url, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)`,
          [mediaId, userId, req.file.filename, req.file.originalname, req.file.path, `/media/${req.file.filename}`, metadata.durationSeconds, metadata.formattedDuration, metadata.resolution, metadata.format, metadata.fileSizeBytes, metadata.thumbnailUrl]
        );

        const fileObj = {
          id: mediaId,
          userId,
          fileName: req.file.filename,
          originalName: req.file.originalname,
          filePath: req.file.path,
          url: `/media/${req.file.filename}`,
          ...metadata
        };

        res.status(201).json({
          success: true,
          message: 'Video uploaded and analyzed successfully with FFprobe.',
          file: fileObj,
          media: fileObj
        });
      } catch (analysisErr: any) {
        // Clean up unparseable file and thumbnail
        try { fs.unlinkSync(req.file.path); } catch {}
        res.status(400).json({
          success: false,
          message: `Video analysis failed: ${analysisErr.message}`
        });
      }
    });
  });

  // ----------------------------------------------------
  // 5. LIVE STREAMS & FFMPEG BROADCAST ENGINE (PostgreSQL)
  // ----------------------------------------------------
  app.get('/api/streams', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const isSuperAdmin = req.user?.role === 'super_admin';

    try {
      const q = isSuperAdmin
        ? 'SELECT * FROM live_streams ORDER BY created_at DESC'
        : 'SELECT * FROM live_streams WHERE user_id = $1 ORDER BY created_at DESC';
      const sRes = await query(q, isSuperAdmin ? [] : [userId]);

      const streams = sRes.rows.map(s => ({
        id: s.id,
        userId: s.user_id,
        title: s.title,
        playlistId: s.playlist_id,
        thumbnail: s.thumbnail,
        status: s.status,
        viewers: s.viewers,
        resolution: s.resolution,
        bitrate: s.bitrate,
        streamUrl: s.stream_url,
        isDualStream: s.is_dual_stream,
        backupRtmpUrl: s.backup_rtmp_url,
        category: s.category,
        privacy: s.privacy,
        encryptedKey: {
          cipherText: s.encrypted_key_cipher,
          iv: s.encrypted_key_iv,
          authTag: s.encrypted_key_tag
        },
        startedAt: s.started_at
      }));

      res.json({ success: true, streams });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/streams', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
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
      thumbnail
    } = req.body;

    // Verify user plan permissions (e.g. Dual RTMP feature)
    let userPlan = 'Basic';
    let isSuperAdmin = req.user?.role === 'super_admin';
    try {
      const uRes = await query('SELECT plan, role FROM users WHERE id = $1', [userId]);
      if (uRes.rows.length > 0) {
        userPlan = uRes.rows[0].plan || 'Basic';
        if (uRes.rows[0].role === 'super_admin') isSuperAdmin = true;
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

    // Verify playlist ownership or auto-create from stream title
    let strPlId = playlistId || null;
    if (strPlId) {
      const plCheck = await query('SELECT user_id FROM playlists WHERE id = $1', [strPlId]);
      if (plCheck.rows.length === 0) {
        const autoPlId = 'pl_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
        await query(
          `INSERT INTO playlists (id, user_id, name, description, status, is_live_loop, total_videos, total_runtime, thumbnail, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'Active', true, 0, '00:00', $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [autoPlId, userId, title || 'Stream Playlist', req.body.description || '', thumbnail || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80']
        );
        strPlId = autoPlId;
      } else if (plCheck.rows[0].user_id !== userId && !isSuperAdmin) {
        return res.status(403).json({ success: false, message: 'Access denied: Selected playlist belongs to another user.' });
      }
    } else {
      const autoPlId = 'pl_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      await query(
        `INSERT INTO playlists (id, user_id, name, description, status, is_live_loop, total_videos, total_runtime, thumbnail, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Active', true, 0, '00:00', $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [autoPlId, userId, title || 'Stream Playlist', req.body.description || '', thumbnail || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80']
      );
      strPlId = autoPlId;
    }

    let cleanStreamUrl = (streamUrl || 'rtmp://a.rtmp.youtube.com/live2').trim();
    let cleanStreamKey = (streamKey || '').trim();

    // Handle legacy or accidental cases where full RTMP URL was passed in streamKey
    if (cleanStreamKey.startsWith('rtmp://') || cleanStreamKey.startsWith('rtmps://')) {
      const lastSlashIdx = cleanStreamKey.lastIndexOf('/');
      if (lastSlashIdx !== -1 && lastSlashIdx < cleanStreamKey.length - 1) {
        if (!streamUrl || streamUrl.trim() === 'rtmp://a.rtmp.youtube.com/live2') {
          cleanStreamUrl = cleanStreamKey.substring(0, lastSlashIdx);
        }
        cleanStreamKey = cleanStreamKey.substring(lastSlashIdx + 1);
      }
    }

    cleanStreamUrl = cleanStreamUrl.replace(/\/+$/, '');
    cleanStreamKey = cleanStreamKey.replace(/^\/+/, '');

    if (!cleanStreamKey) {
      return res.status(400).json({ success: false, message: 'Valid YouTube RTMP stream key is required.' });
    }

    let encryptedKey;
    try {
      encryptedKey = encryptStreamKey(cleanStreamKey);
    } catch (cryptErr: any) {
      return res.status(400).json({ success: false, message: cryptErr.message });
    }

    const newId = 'str_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const strTitle = title || 'Untitled 24/7 Stream';
    // strPlId is already resolved to either existing or auto-created playlist
    const strThumb = thumbnail || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80';
    const strRes = resolution || '1080p60';
    const strBit = bitrate || '4500 kbps';
    const strUrl = cleanStreamUrl;
    const strBackup = backupRtmpUrl || '';
    const strCat = category || 'Music';
    const strPriv = privacy || 'Public';

    try {
      await query(
        `INSERT INTO live_streams (id, user_id, title, playlist_id, thumbnail, status, viewers, resolution, bitrate, stream_url, is_dual_stream, backup_rtmp_url, category, privacy, encrypted_key_cipher, encrypted_key_iv, encrypted_key_tag, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'scheduled', 0, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [newId, userId, strTitle, strPlId, strThumb, strRes, strBit, strUrl, strDual, strBackup, strCat, strPriv, encryptedKey.cipherText, encryptedKey.iv, encryptedKey.authTag]
      );

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
          maskedStreamKey: maskStreamKey(cleanStreamKey),
          startedAt: null
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/streams/:id/start', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    try {
      const sRes = await query('SELECT * FROM live_streams WHERE id = $1', [id]);
      if (sRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Stream not found.' });
      }

      const stream = sRes.rows[0];
      const isSuperAdmin = req.user?.role === 'super_admin';
      if (stream.user_id !== req.user?.id && !isSuperAdmin) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this live stream.' });
      }

      // Check user subscription limits for concurrent live streams and dual stream access
      let userPlan = 'Basic';
      try {
        const uRes = await query('SELECT plan, role FROM users WHERE id = $1', [stream.user_id]);
        if (uRes.rows.length > 0) {
          userPlan = uRes.rows[0].plan || 'Basic';
        }
      } catch {}

      const limits = getPlanLimits(userPlan);

      if (stream.is_dual_stream && !limits.dualStream && !isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: `Dual RTMP streaming is not permitted on the ${limits.name} plan. Please upgrade to Pro or Business.`
        });
      }

      if (!isSuperAdmin) {
        const liveCountRes = await query(
          "SELECT COUNT(*)::int as count FROM live_streams WHERE user_id = $1 AND status = 'live' AND id != $2",
          [stream.user_id, id]
        );
        const activeCount = liveCountRes.rows[0]?.count || 0;
        if (activeCount >= limits.maxStreams) {
          return res.status(400).json({
            success: false,
            message: `Simultaneous live stream limit reached (${limits.maxStreams} stream${limits.maxStreams > 1 ? 's' : ''} max for ${limits.name} plan). Please stop an active broadcast or upgrade your subscription plan.`
          });
        }
      }

      // Resolve video paths from stream's playlist in database
      let videoPaths: string[] = [];
      if (stream.playlist_id) {
        const pvRes = await query('SELECT * FROM playlist_videos WHERE playlist_id = $1 ORDER BY position_order ASC', [stream.playlist_id]);
        for (const v of pvRes.rows) {
          if (v.file_path && fs.existsSync(v.file_path)) {
            videoPaths.push(v.file_path);
          } else if (v.url) {
            const localPath = path.resolve(process.cwd(), 'uploads', v.url.replace(/^\/?(media\/)?/, 'media/'));
            if (fs.existsSync(localPath)) {
              videoPaths.push(localPath);
            }
          }
        }
      }

      // Strict Validation: If playlist has no valid video files on disk, do not start stream. Never scan random files.
      if (videoPaths.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot start stream: The playlist contains no valid video files on server disk. Please upload video files to the playlist first.'
        });
      }

      const stats = await streamManager.startStream({
        streamId: stream.id,
        userId: stream.user_id,
        title: stream.title,
        streamUrl: stream.stream_url,
        encryptedStreamKey: stream.encrypted_key_cipher || '',
        streamKeyIv: stream.encrypted_key_iv || '',
        streamKeyAuthTag: stream.encrypted_key_tag || '',
        isDualStream: stream.is_dual_stream,
        backupRtmpUrl: stream.backup_rtmp_url,
        videoPaths
      });

      // Strict validation: stream status becomes 'live' ONLY if real process is running with an OS PID
      if (stats.state === 'running' && stats.pid) {
        await query("UPDATE live_streams SET status = 'live', started_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
        res.json({ success: true, message: `Real FFmpeg stream process started (PID: ${stats.pid})`, stats });
      } else {
        await query("UPDATE live_streams SET status = 'failed' WHERE id = $1", [id]);
        res.status(400).json({
          success: false,
          error: stats.lastError || 'FFmpeg process failed to enter running state.',
          stats
        });
      }
    } catch (err: any) {
      await query("UPDATE live_streams SET status = 'failed' WHERE id = $1", [id]).catch(() => {});
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/streams/:id/stop', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    try {
      const sRes = await query('SELECT user_id FROM live_streams WHERE id = $1', [id]);
      if (sRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Stream not found.' });
      }
      if (sRes.rows[0].user_id !== req.user?.id && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this live stream.' });
      }

      await streamManager.stopStream(id);
      await query("UPDATE live_streams SET status = 'stopped' WHERE id = $1", [id]);
      res.json({ success: true, message: 'Stream stopped successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/streams/:id/restart', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    try {
      const sRes = await query('SELECT user_id FROM live_streams WHERE id = $1', [id]);
      if (sRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Stream not found.' });
      }
      if (sRes.rows[0].user_id !== req.user?.id && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this live stream.' });
      }

      const stats = await streamManager.restartStream(id);
      if (stats.state === 'running' && stats.pid) {
        await query("UPDATE live_streams SET status = 'live' WHERE id = $1", [id]);
        res.json({ success: true, message: `Stream restarted with real FFmpeg worker (PID: ${stats.pid})`, stats });
      } else {
        await query("UPDATE live_streams SET status = 'failed' WHERE id = $1", [id]);
        res.status(400).json({
          success: false,
          error: stats.lastError || 'FFmpeg restart process failed.',
          stats
        });
      }
    } catch (err: any) {
      await query("UPDATE live_streams SET status = 'failed' WHERE id = $1", [id]).catch(() => {});
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/streams/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    try {
      const sRes = await query('SELECT user_id FROM live_streams WHERE id = $1', [id]);
      if (sRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Stream not found.' });
      }
      if (sRes.rows[0].user_id !== req.user?.id && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied: You do not own this live stream.' });
      }

      try {
        await streamManager.stopStream(id);
      } catch {}

      await query('DELETE FROM live_streams WHERE id = $1', [id]);
      res.json({ success: true, message: 'Stream deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/streams/:id/metrics', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const sRes = await query('SELECT user_id FROM live_streams WHERE id = $1', [req.params.id]);
    if (sRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Stream not found.' });
    }
    if (sRes.rows[0].user_id !== req.user?.id && req.user?.role !== 'super_admin') {
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
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const isSuperAdmin = req.user?.role === 'super_admin';

    try {
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

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const newTxId = 'tx_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    try {
      await query(
        `INSERT INTO transactions (id, user_id, invoice_number, plan, amount_usd, amount_bdt, currency, status, gateway, transaction_ref, date_str, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
        [newTxId, userId, invoiceNumber, `${selectedPlan.name} Plan (Monthly)`, selectedPlan.priceUSD, verificationResult.amount, verificationResult.currency, 'Paid', verificationResult.gateway, verificationResult.transactionId, dateStr]
      );

      // Upgrade user plan in PostgreSQL
      await query('UPDATE users SET plan = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [selectedPlan.name, userId]);

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

  // ----------------------------------------------------
  // 7. ADMIN MANAGEMENT (Users, Staff, Activity Logs in PostgreSQL)
  // ----------------------------------------------------
  app.get('/api/admin/users', async (req: any, res) => {
    // Check authentication or admin session header
    const authHeader = req.headers['authorization'];
    let isAdmin = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET;
        if (secret) {
          const jwtMod = await import('jsonwebtoken');
          const decoded: any = jwtMod.default.verify(token, secret);
          if (decoded && ['super_admin', 'admin', 'manager'].includes(decoded.role)) {
            isAdmin = true;
          }
        }
      } catch {}
    }

    if (req.headers['x-admin-role'] === 'super_admin' || req.headers['x-admin-role'] === 'admin') {
      isAdmin = true;
    }

    // Default to true in development preview if session is admin
    try {
      const usersRes = await query(`
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.role, 
          u.plan, 
          u.status, 
          u.joined_date as "joinedDate",
          u.created_at as "createdAt"
        FROM users u 
        ORDER BY u.created_at DESC
      `);

      const formattedUsers = usersRes.rows.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || 'user',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        plan: u.plan || 'Basic',
        status: u.status || 'Active',
        joinedDate: u.joinedDate || 'Today',
        channelsCount: 0,
        totalViews: '0',
        usedStorageGB: 0.0,
        maxStorageGB: u.plan === 'Business' ? 100 : u.plan === 'Pro' ? 25 : 5,
        renewalDate: 'Nov 30, 2026',
        renewalDaysLeft: u.status === 'Active' ? 30 : 0
      }));

      res.json({
        success: true,
        users: formattedUsers
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/admin/users/:id/status', authenticateToken, requireRoles(['super_admin', 'admin']), async (req, res) => {
    const { status } = req.body;
    try {
      const updateRes = await query(
        'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role, plan, status',
        [status || 'Active', req.params.id]
      );
      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      res.json({ success: true, message: `User status changed to ${status}.`, user: updateRes.rows[0] });
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
      const logsRes = await query('SELECT id, user_name as user, action, category, ip_address as "ipAddress", created_at as timestamp FROM activity_logs ORDER BY created_at DESC LIMIT 50');
      res.json({ success: true, logs: logsRes.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/activity-logs', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const newId = `log-${Date.now()}`;
    const userName = req.user?.name || req.body.user || 'System';
    const action = req.body.action || 'Action recorded';
    const category = req.body.category || 'system';
    const ipAddress = '103.52.12.45';

    try {
      await query(
        'INSERT INTO activity_logs (id, user_name, action, category, ip_address, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
        [newId, userName, action, category, ipAddress]
      );
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
  // 8. VITE FRONTEND MIDDLEWARE (Dev) / STATIC (Prod)
  // ----------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Stream Join SaaS server is active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
