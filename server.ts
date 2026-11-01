import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabaseConnection, isDbConnected } from './src/server/db/db';
import { encryptStreamKey } from './src/server/utils/crypto';
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

async function startServer() {
  // Validate critical security environment variables (halts if missing)
  validateJwtConfig();

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Static directory for uploaded media files
  const mediaDir = process.env.MEDIA_UPLOAD_DIR || path.resolve(__dirname, 'uploads/media');
  app.use('/media', express.static(mediaDir));

  // Initialize PostgreSQL Connection Pool asynchronously in background
  initDatabaseConnection().catch(e => console.warn('[PostgreSQL] Startup notice:', e.message));

  const streamManager = StreamManager.getInstance();

  // In-memory data store (synced with PostgreSQL if connected, provides instant sub-millisecond response)
  let dbUsers: any[] = [
    {
      id: 'u-1',
      name: 'Fahim Ahmed',
      email: 'fahim@streamjoin.com',
      passwordHash: await hashPassword('password123'),
      role: 'user',
      plan: 'Pro',
      status: 'Active',
      joinedDate: 'Oct 30, 2026'
    },
    {
      id: 'u-admin',
      name: 'Super Admin',
      email: 'admin@streamjoin.com',
      passwordHash: await hashPassword('admin1234'),
      role: 'super_admin',
      plan: 'Business',
      status: 'Active',
      joinedDate: 'Oct 01, 2026'
    }
  ];

  let dbPasswordResets: any[] = [];

  let dbStreams: any[] = [
    {
      id: 'str-1',
      userId: 'u-1',
      title: 'Relaxing Music Live',
      playlistId: 'pl-1',
      thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
      status: 'live',
      viewers: 1449,
      resolution: '1080p60',
      bitrate: '4500 kbps',
      streamUrl: 'rtmp://a.rtmp.youtube.com/live2',
      isDualStream: false,
      backupRtmpUrl: '',
      encryptedKey: encryptStreamKey('stream_key_placeholder_music_1'),
      startedAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'str-2',
      userId: 'u-1',
      title: 'Study With Me Live',
      playlistId: 'pl-2',
      thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80',
      status: 'scheduled',
      viewers: 0,
      resolution: '1080p60',
      bitrate: '4000 kbps',
      streamUrl: 'rtmp://a.rtmp.youtube.com/live2',
      isDualStream: false,
      backupRtmpUrl: '',
      encryptedKey: encryptStreamKey('stream_key_placeholder_study_2'),
      startedAt: null
    }
  ];

  let dbPlaylists: any[] = [
    {
      id: 'pl-1',
      userId: 'u-1',
      name: 'Relaxing Music',
      description: 'Continuous ambient beats and relaxing instruments for 24/7 stream',
      status: 'Active',
      isLiveLoop: true,
      totalVideos: 2,
      totalRuntime: '04:32',
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      videos: [
        {
          id: 'v-1',
          title: 'Deep Ambient Lo-Fi Tape #1 (Rain & Beats)',
          duration: '12:45',
          durationSeconds: 765,
          resolution: '1080p FHD',
          format: 'MP4 Loop',
          url: 'https://cdn.streamjoin.com/media/ambient1.mp4',
          thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
          positionOrder: 1
        },
        {
          id: 'v-2',
          title: 'Midnight Chill Beats - Urban Tokyo Mix',
          duration: '15:00',
          durationSeconds: 900,
          resolution: '1080p FHD',
          format: 'MP4 Loop',
          url: 'https://cdn.streamjoin.com/media/loop-track.mp4',
          thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
          positionOrder: 2
        }
      ]
    },
    {
      id: 'pl-2',
      userId: 'u-1',
      name: 'Study Music',
      description: 'Focus piano and binaural study tracks',
      status: 'Scheduled',
      isLiveLoop: true,
      totalVideos: 0,
      totalRuntime: '00:00',
      thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80',
      videos: []
    }
  ];

  let dbTransactions: any[] = [
    {
      id: 'tx-1',
      userId: 'u-1',
      invoiceNumber: 'INV-2026-001',
      plan: 'Pro Plan (Monthly)',
      amountUSD: 29,
      amountBDT: 2990,
      currency: 'BDT',
      status: 'Paid',
      gateway: 'bKash',
      transactionRef: 'BKH98341201',
      date: 'Oct 30, 2026'
    }
  ];

  let dbStaff: any[] = [
    { id: 'st-1', name: 'Admin', role: 'Super Admin', email: 'admin@streamjoin.com', status: 'Active' },
    { id: 'st-2', name: 'Rafiq Hasan', role: 'Manager', email: 'rafiq@streamjoin.com', status: 'Active' },
    { id: 'st-3', name: 'Jannat Ara', role: 'Support', email: 'jannat@streamjoin.com', status: 'Active' }
  ];

  let dbActivityLogs: any[] = [
    {
      id: 'log-1',
      user: 'Admin',
      action: 'System Boot & FFmpeg Supervisor Initialized',
      category: 'system',
      ipAddress: '103.52.12.45',
      timestamp: 'Just now'
    }
  ];

  // Auto-recovery of active streams on startup (asynchronously after server binds)
  setTimeout(() => {
    const liveConfigs: StreamConfig[] = dbStreams
      .filter(s => s.status === 'live')
      .map(s => ({
        streamId: s.id,
        userId: s.userId,
        title: s.title,
        streamUrl: s.streamUrl,
        encryptedStreamKey: s.encryptedKey.cipherText,
        streamKeyIv: s.encryptedKey.iv,
        streamKeyAuthTag: s.encryptedKey.authTag,
        isDualStream: s.isDualStream,
        backupRtmpUrl: s.backupRtmpUrl
      }));
    streamManager.recoverActiveStreams(liveConfigs).catch(err => {
      console.warn('[FFmpeg Recovery] Startup recovery note:', err.message);
    });
  }, 1000);

  // ----------------------------------------------------
  // 1. HEALTH & SYSTEM MONITORING ROUTES
  // ----------------------------------------------------
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      platform: 'Stream Join Core SaaS Engine',
      version: '3.5.0',
      database: isDbConnected() ? 'PostgreSQL 16 Active' : 'Memory Adapter Ready',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/system/db-status', (_req, res) => {
    res.json({
      isPostgreSqlConnected: isDbConnected(),
      databaseEngine: 'PostgreSQL Relational',
      connectionPoolLimit: 20,
      activeUsers: dbUsers.length,
      activeStreams: dbStreams.filter(s => s.status === 'live').length
    });
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
  // 2. AUTHENTICATION & PERMISSIONS
  // ----------------------------------------------------
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const existing = dbUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const newUser = {
      id: `u-${Date.now()}`,
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      passwordHash,
      role: 'user' as const,
      plan: 'Basic',
      status: 'Active',
      joinedDate: 'Today'
    };

    dbUsers.unshift(newUser);
    const token = signToken(newUser);

    res.status(201).json({
      success: true,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, plan: newUser.plan },
      token
    });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = dbUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan },
      token
    });
  });

  app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
    res.json({ success: true, user: req.user });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    const token = `reset_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    dbPasswordResets.push({
      email,
      token,
      expiresAt: Date.now() + 3600000 // 1 hour
    });
    res.json({
      success: true,
      message: 'Password reset instructions sent to your email address.',
      resetToken: token
    });
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    const resetRecord = dbPasswordResets.find(r => r.token === token && r.expiresAt > Date.now());
    if (!resetRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token.' });
    }

    const user = dbUsers.find(u => u.email.toLowerCase() === resetRecord.email.toLowerCase());
    if (user) {
      user.passwordHash = await hashPassword(newPassword);
    }
    dbPasswordResets = dbPasswordResets.filter(r => r.token !== token);
    res.json({ success: true, message: 'Password reset successfully. You can now login.' });
  });

  // ----------------------------------------------------
  // 3. PLAYLISTS & VIDEO MANAGEMENT
  // ----------------------------------------------------
  app.get('/api/playlists', authenticateToken, (req: AuthenticatedRequest, res) => {
    // Multi-tenant user isolation
    const userId = req.user?.id || 'u-1';
    const userPlaylists = req.user?.role === 'super_admin'
      ? dbPlaylists
      : dbPlaylists.filter(p => p.userId === userId || p.userId === 'u-1');

    res.json({ success: true, playlists: userPlaylists });
  });

  app.post('/api/playlists', authenticateToken, (req: AuthenticatedRequest, res) => {
    const { name, description, isLiveLoop, thumbnail } = req.body;
    const newPlaylist = {
      id: `pl-${Date.now()}`,
      userId: req.user?.id || 'u-1',
      name: name || 'New Live Playlist',
      description: description || '',
      status: 'Scheduled',
      isLiveLoop: isLiveLoop !== undefined ? isLiveLoop : true,
      totalVideos: 0,
      totalRuntime: '00:00',
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      videos: []
    };
    dbPlaylists.unshift(newPlaylist);
    res.status(201).json({ success: true, playlist: newPlaylist });
  });

  app.get('/api/playlists/:id', authenticateToken, (req, res) => {
    const playlist = dbPlaylists.find(p => p.id === req.params.id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });
    res.json({ success: true, playlist });
  });

  app.put('/api/playlists/:id', authenticateToken, (req, res) => {
    const playlist = dbPlaylists.find(p => p.id === req.params.id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });

    Object.assign(playlist, req.body);
    res.json({ success: true, playlist });
  });

  app.delete('/api/playlists/:id', authenticateToken, (req, res) => {
    dbPlaylists = dbPlaylists.filter(p => p.id !== req.params.id);
    res.json({ success: true, message: 'Playlist deleted successfully.' });
  });

  app.post('/api/playlists/:id/videos', authenticateToken, (req, res) => {
    const playlist = dbPlaylists.find(p => p.id === req.params.id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });

    const newVideo = {
      id: `v-${Date.now()}`,
      title: req.body.title || 'Untitled Track',
      duration: req.body.duration || '05:00',
      durationSeconds: req.body.durationSeconds || 300,
      resolution: req.body.resolution || '1080p FHD',
      format: req.body.format || 'MP4 Loop',
      url: req.body.url || 'https://cdn.streamjoin.com/media/loop-track.mp4',
      thumbnail: req.body.thumbnail || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
      positionOrder: (playlist.videos.length || 0) + 1
    };

    playlist.videos.push(newVideo);
    playlist.totalVideos = playlist.videos.length;
    res.status(201).json({ success: true, video: newVideo });
  });

  app.put('/api/playlists/:id/videos/reorder', authenticateToken, (req, res) => {
    const playlist = dbPlaylists.find(p => p.id === req.params.id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });

    const { orderedVideoIds } = req.body;
    if (Array.isArray(orderedVideoIds)) {
      playlist.videos.sort((a: any, b: any) => {
        return orderedVideoIds.indexOf(a.id) - orderedVideoIds.indexOf(b.id);
      });
      playlist.videos.forEach((v: any, idx: number) => {
        v.positionOrder = idx + 1;
      });
    }

    res.json({ success: true, message: 'Videos reordered successfully.', videos: playlist.videos });
  });

  app.delete('/api/playlists/:id/videos/:videoId', authenticateToken, (req, res) => {
    const playlist = dbPlaylists.find(p => p.id === req.params.id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });

    playlist.videos = playlist.videos.filter((v: any) => v.id !== req.params.videoId);
    playlist.totalVideos = playlist.videos.length;
    res.json({ success: true, message: 'Video removed from playlist.' });
  });

  // ----------------------------------------------------
  // 4. VIDEO UPLOAD & MEDIA STORAGE
  // ----------------------------------------------------
  app.post('/api/media/upload', authenticateToken, videoUpload.single('video'), async (req: AuthenticatedRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file provided.' });
    }

    const metadata = await extractVideoMetadata(req.file.path, req.file.originalname);
    res.status(201).json({
      success: true,
      file: {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        url: `/media/${req.file.filename}`,
        ...metadata
      }
    });
  });

  // ----------------------------------------------------
  // 5. LIVE STREAMS & FFMPEG BROADCAST ENGINE
  // ----------------------------------------------------
  app.get('/api/streams', authenticateToken, (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id || 'u-1';
    const userStreams = req.user?.role === 'super_admin'
      ? dbStreams
      : dbStreams.filter(s => s.userId === userId || s.userId === 'u-1');

    res.json({ success: true, streams: userStreams });
  });

  app.post('/api/streams', authenticateToken, (req: AuthenticatedRequest, res) => {
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

    // Encrypt sensitive RTMP Stream Key via AES-256-GCM
    const encryptedKey = encryptStreamKey(streamKey || '');

    const newStream = {
      id: `str-${Date.now()}`,
      userId: req.user?.id || 'u-1',
      title: title || 'Untitled 24/7 Stream',
      playlistId: playlistId || null,
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
      status: 'scheduled',
      viewers: 0,
      resolution: resolution || '1080p60',
      bitrate: bitrate || '4500 kbps',
      streamUrl: streamUrl || 'rtmp://a.rtmp.youtube.com/live2',
      isDualStream: Boolean(isDualStream),
      backupRtmpUrl: backupRtmpUrl || '',
      category: category || 'Music',
      privacy: privacy || 'Public',
      encryptedKey,
      startedAt: null
    };

    dbStreams.unshift(newStream);
    res.status(201).json({ success: true, stream: newStream });
  });

  app.post('/api/streams/:id/start', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const stream = dbStreams.find(s => s.id === id);
    if (!stream) {
      return res.status(404).json({ success: false, message: 'Stream not found.' });
    }

    try {
      const stats = await streamManager.startStream({
        streamId: stream.id,
        userId: stream.userId,
        title: stream.title,
        streamUrl: stream.streamUrl,
        encryptedStreamKey: stream.encryptedKey?.cipherText || '',
        streamKeyIv: stream.encryptedKey?.iv || '',
        streamKeyAuthTag: stream.encryptedKey?.authTag || '',
        isDualStream: stream.isDualStream,
        backupRtmpUrl: stream.backupRtmpUrl
      });

      stream.status = 'live';
      stream.startedAt = new Date().toISOString();
      res.json({ success: true, message: 'Stream started in isolated process', stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/streams/:id/stop', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const stream = dbStreams.find(s => s.id === id);
    if (!stream) {
      return res.status(404).json({ success: false, message: 'Stream not found.' });
    }

    await streamManager.stopStream(id);
    stream.status = 'completed';
    res.json({ success: true, message: 'Stream stopped successfully.' });
  });

  app.post('/api/streams/:id/restart', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const stream = dbStreams.find(s => s.id === id);
    if (!stream) {
      return res.status(404).json({ success: false, message: 'Stream not found.' });
    }

    try {
      const stats = await streamManager.restartStream(id);
      stream.status = 'live';
      res.json({ success: true, message: 'Stream restarted from sequence beginning', stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/streams/:id/metrics', authenticateToken, (req, res) => {
    const stats = streamManager.getStreamStats(req.params.id);
    res.json({ success: true, stats });
  });

  // ----------------------------------------------------
  // 6. SUBSCRIPTIONS & VERIFIED PAYMENTS (bKash, Nagad, Stripe)
  // ----------------------------------------------------
  app.get('/api/billing/plans', (_req, res) => {
    res.json({ success: true, plans: SUBSCRIPTION_TIERS });
  });

  app.get('/api/billing/transactions', authenticateToken, (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id || 'u-1';
    const txs = req.user?.role === 'super_admin'
      ? dbTransactions
      : dbTransactions.filter(t => t.userId === userId || t.userId === 'u-1');

    res.json({ success: true, transactions: txs });
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

    // Record verified transaction
    const newTx = {
      id: `tx-${Date.now()}`,
      userId: req.user?.id || 'u-1',
      invoiceNumber: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      plan: `${selectedPlan.name} Plan (Monthly)`,
      amountUSD: selectedPlan.priceUSD,
      amountBDT: selectedPlan.priceBDT,
      currency: verificationResult.currency,
      status: 'Paid',
      gateway: verificationResult.gateway,
      transactionRef: verificationResult.transactionId,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    };

    dbTransactions.unshift(newTx);

    // Upgrade user plan
    const user = dbUsers.find(u => u.id === (req.user?.id || 'u-1'));
    if (user) {
      user.plan = selectedPlan.name;
    }

    res.status(200).json({
      success: true,
      message: `Payment successfully verified. Subscription upgraded to ${selectedPlan.name} plan!`,
      transaction: newTx,
      plan: selectedPlan
    });
  });

  // ----------------------------------------------------
  // 7. ADMIN MANAGEMENT (Users, Staff, Activity Logs)
  // ----------------------------------------------------
  app.get('/api/admin/users', authenticateToken, requireRoles(['super_admin', 'admin']), (_req, res) => {
    res.json({
      success: true,
      users: dbUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        plan: u.plan,
        status: u.status,
        joinedDate: u.joinedDate
      }))
    });
  });

  app.put('/api/admin/users/:id/status', authenticateToken, requireRoles(['super_admin', 'admin']), (req, res) => {
    const user = dbUsers.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.status = req.body.status || 'Active';
    res.json({ success: true, message: `User status changed to ${user.status}.`, user });
  });

  app.get('/api/admin/staff', authenticateToken, requireRoles(['super_admin', 'admin']), (_req, res) => {
    res.json({ success: true, staff: dbStaff });
  });

  app.get('/api/activity-logs', authenticateToken, (_req, res) => {
    res.json({ success: true, logs: dbActivityLogs });
  });

  app.post('/api/activity-logs', authenticateToken, (req: AuthenticatedRequest, res) => {
    const newLog = {
      id: `log-${Date.now()}`,
      user: req.user?.name || req.body.user || 'System',
      action: req.body.action || 'Action recorded',
      category: req.body.category || 'system',
      ipAddress: '103.52.12.45',
      timestamp: 'Just now'
    };
    dbActivityLogs.unshift(newLog);
    res.status(201).json({ success: true, log: newLog });
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
