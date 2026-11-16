import { spawn, ChildProcess, execSync, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import tls from 'tls';
import { decryptStreamKey } from '../utils/crypto';

export interface StreamConfig {
  streamId: string;
  userId: string;
  title: string;
  streamUrl: string;
  encryptedStreamKey: string;
  streamKeyIv: string;
  streamKeyAuthTag: string;
  isDualStream?: boolean;
  backupRtmpUrl?: string;
  videoPaths?: string[]; // Array of video file paths on server in true playlist order
  initialTrackIndex?: number; // Starting index in videoPaths (0-based)
  resolution?: string;
  videoBitrateKbps?: number;
  fps?: number;
}

export interface StreamProcessStats {
  streamId: string;
  userId: string;
  pid: number | null;
  state: 'starting' | 'running' | 'reconnecting' | 'stopped' | 'crashed';
  fps: number;
  bitrateKbps: number;
  cpuPercent: number;
  memoryMb: number;
  uptimeSeconds: number;
  restartAttempts: number;
  lastError: string | null;
  startedAt: string;
  currentTrackIndex: number;
  currentTrackStartedAt: string;
  totalTracks: number;
}

export class StreamManager {
  private static instance: StreamManager;
  private processes: Map<string, {
    child?: ChildProcess;
    feederChild?: ChildProcess;
    config: StreamConfig;
    stats: StreamProcessStats;
    concatFilePath?: string;
    currentTrackIndex: number;
    cumulativeTsOffset: number;
    consecutiveFeederFailures: number;
    intervalTimer?: NodeJS.Timeout;
    reconnectTimer?: NodeJS.Timeout;
    recentStderr: string[];
    localBridge?: net.Server;
    localBackupBridge?: net.Server;
    activeBridgeSockets?: Set<net.Socket>;
  }> = new Map();

  private stopPromises: Map<string, Promise<boolean>> = new Map();
  private isFfmpegInstalled: boolean = false;
  private onStreamHaltedCallback?: (streamId: string, error: string) => void;

  private constructor() {
    this.checkFfmpeg();
    this.startSupervisorHeartbeat();
  }

  public setOnStreamHalted(cb: (streamId: string, error: string) => void) {
    this.onStreamHaltedCallback = cb;
  }

  public static getInstance(): StreamManager {
    if (!StreamManager.instance) {
      StreamManager.instance = new StreamManager();
    }
    return StreamManager.instance;
  }

  public checkFfmpeg(): boolean {
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
      this.isFfmpegInstalled = true;
      console.log('[FFmpeg Job Manager] System FFmpeg binary detected and ready.');
    } catch {
      this.isFfmpegInstalled = false;
      console.warn('[FFmpeg Job Manager] Notice: FFmpeg binary not found on this host system. Real live streaming via FFmpeg is unavailable until installed.');
    }
    return this.isFfmpegInstalled;
  }

  public isAvailable(): boolean {
    return this.isFfmpegInstalled;
  }

  public hasAudioTrack(videoPath: string): boolean {
    if (!fs.existsSync(videoPath)) return false;
    try {
      const probeOut = execFileSync(
        'ffprobe',
        [
          '-v', 'error',
          '-probesize', '10M',
          '-analyzeduration', '10M',
          '-select_streams', 'a:0',
          '-show_entries', 'stream=codec_type',
          '-of', 'default=noprint_wrappers=1:nokey=1',
          videoPath
        ],
        { timeout: 15000 }
      ).toString().trim();
      return probeOut.includes('audio');
    } catch {
      return false;
    }
  }

  private probeClipDetails(videoPath: string): {
    duration: number | null;
    hasAudio: boolean;
    width: number;
    height: number;
    fps: number;
  } {
    let duration: number | null = null;
    let hasAudio = false;
    let width = 1920;
    let height = 1080;
    let fps = 30;
    if (!fs.existsSync(videoPath)) {
      return { duration, hasAudio, width, height, fps };
    }
    try {
      const out = execFileSync(
        'ffprobe',
        [
          '-v', 'error',
          '-probesize', '10M',
          '-analyzeduration', '10M',
          '-show_entries', 'stream=codec_type,width,height,r_frame_rate,duration:format=duration',
          '-of', 'json',
          videoPath
        ],
        { timeout: 15000, maxBuffer: 4 * 1024 * 1024 }
      ).toString();
      const parsed = JSON.parse(out);
      const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
      const vStream = streams.find((s: any) => s.codec_type === 'video');
      const aStream = streams.find((s: any) => s.codec_type === 'audio');
      hasAudio = Boolean(aStream);
      if (vStream) {
        if (vStream.width) width = parseInt(vStream.width, 10) || 1920;
        if (vStream.height) height = parseInt(vStream.height, 10) || 1080;
        if (typeof vStream.r_frame_rate === 'string' && vStream.r_frame_rate.includes('/')) {
          const [num, den] = vStream.r_frame_rate.split('/').map(Number);
          if (den > 0 && num > 0) fps = Math.round(num / den);
        }
      }
      const rawDur = parseFloat(parsed.format?.duration || vStream?.duration || '0');
      if (!isNaN(rawDur) && rawDur > 0) duration = rawDur;
    } catch {}
    return { duration, hasAudio, width, height, fps };
  }

  /**
   * Keeps original file untouched for streaming; spawnClipFeeder injects silent AAC audio
   * on-the-fly in the MPEG-TS pipe whenever a video has no audio track, avoiding blocking 20s disk copies on large 4K files.
   */
  public ensureVideoAudioTrack(videoPath: string): string {
    return videoPath;
  }

  /**
   * Probes precise duration in seconds using ffprobe.
   */
  public getVideoDuration(videoPath: string): number | null {
    if (!fs.existsSync(videoPath)) return null;
    try {
      const probeOut = execFileSync(
        'ffprobe',
        [
          '-v', 'error',
          '-probesize', '10M',
          '-analyzeduration', '10M',
          '-show_entries', 'format=duration',
          '-of', 'default=noprint_wrappers=1:nokey=1',
          videoPath
        ],
        { timeout: 15000 }
      ).toString().trim();
      const dur = parseFloat(probeOut);
      return isNaN(dur) || dur <= 0 ? null : dur;
    } catch {
      return null;
    }
  }

  /**
   * Writes standardized ffconcat file with explicit clip durations.
   */
  public writeConcatFile(concatFilePath: string, videoPaths: string[]) {
    const lines = ['ffconcat version 1.0'];
    for (const v of videoPaths) {
      lines.push(`file '${v.replace(/'/g, "'\\''")}'`);
      const dur = this.getVideoDuration(v);
      if (dur && dur > 0) {
        lines.push(`duration ${dur.toFixed(3)}`);
      }
    }
    fs.writeFileSync(concatFilePath, lines.join('\n') + '\n', 'utf8');
  }

  /**
   * Starts an isolated real FFmpeg live stream process for a user.
   */
  public async startStream(config: StreamConfig): Promise<StreamProcessStats> {
    // If stream is already running with an active child process, return its status
    if (this.processes.has(config.streamId)) {
      const existing = this.processes.get(config.streamId)!;
      if (existing.stats.state === 'running' && existing.child && !existing.child.killed && existing.stats.pid) {
        return { ...existing.stats };
      }
      // If previous process died or stopped, clean it up before launching new process
      await this.stopStream(config.streamId);
    }

    const startIdx = typeof config.initialTrackIndex === 'number' && config.initialTrackIndex >= 0
      ? config.initialTrackIndex
      : 0;
    const nowIso = new Date().toISOString();

    const initialStats: StreamProcessStats = {
      streamId: config.streamId,
      userId: config.userId,
      pid: null,
      state: 'starting',
      fps: 0,
      bitrateKbps: 0,
      cpuPercent: 0,
      memoryMb: 0,
      uptimeSeconds: 0,
      restartAttempts: 0,
      lastError: null,
      startedAt: nowIso,
      currentTrackIndex: startIdx,
      currentTrackStartedAt: nowIso,
      totalTracks: config.videoPaths?.length || 0
    };

    this.processes.set(config.streamId, {
      config,
      stats: initialStats,
      currentTrackIndex: startIdx,
      cumulativeTsOffset: 0,
      consecutiveFeederFailures: 0,
      recentStderr: []
    });

    return this.launchProcess(config);
  }

  private spawnClipFeeder(streamId: string, masterChild: ChildProcess) {
    const item = this.processes.get(streamId);
    if (!item || item.child !== masterChild) return;
    if (item.stats.state === 'stopped' || item.stats.state === 'crashed') return;
    if (!masterChild.stdin || masterChild.stdin.destroyed || !masterChild.stdin.writable) return;

    const validPaths = (item.config.videoPaths || []).filter(v => typeof v === 'string' && fs.existsSync(v));
    if (validPaths.length === 0) {
      console.error(`[FFmpeg Playlist] No valid video files left for stream ${streamId}`);
      this.stopStream(streamId).catch(() => {});
      return;
    }

    const trackIdx = ((item.currentTrackIndex % validPaths.length) + validPaths.length) % validPaths.length;
    item.currentTrackIndex = trackIdx;
    item.stats.currentTrackIndex = trackIdx;
    item.stats.totalTracks = validPaths.length;

    const clipPath = validPaths[trackIdx];
    const clipInfo = this.probeClipDetails(clipPath);
    const clipDuration = clipInfo.duration || 0;
    const hasAudio = clipInfo.hasAudio;
    const isHeavySource = clipInfo.width > 1920 || clipInfo.height > 1080 || clipInfo.fps > 35;
    const videoBitrate = item.config.videoBitrateKbps || 4500;
    const offsetStr = item.cumulativeTsOffset.toFixed(3);
    const trackStartMs = Date.now();
    item.stats.currentTrackStartedAt = new Date(trackStartMs).toISOString();

    console.log(
      `[FFmpeg Playlist] Stream "${item.config.title}" playing Track #${trackIdx + 1}/${validPaths.length}: ${path.basename(clipPath)} (${clipInfo.width}x${clipInfo.height}@${clipInfo.fps}fps, offset=${offsetStr}s)`
    );

    const feederArgs: string[] = [
      '-re',
      '-probesize', '10M',
      '-analyzeduration', '10M',
      '-i', clipPath
    ];

    if (!hasAudio) {
      feederArgs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
    }

    feederArgs.push(
      '-vf', 'fps=30,scale=1920:1080:force_original_aspect_ratio=decrease:flags=fast_bilinear,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p',
      '-c:v', 'libx264',
      '-preset', isHeavySource ? 'superfast' : 'veryfast'
    );

    if (isHeavySource) {
      feederArgs.push('-tune', 'zerolatency');
    }

    feederArgs.push(
      '-b:v', `${videoBitrate}k`,
      '-maxrate', `${videoBitrate}k`,
      '-bufsize', `${videoBitrate * 2}k`,
      '-pix_fmt', 'yuv420p',
      '-g', '60',
      '-keyint_min', '60',
      '-sc_threshold', '0',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2',
      '-af', 'aresample=async=1',
      '-map', '0:v:0',
      '-map', hasAudio ? '0:a:0' : '1:a:0',
      '-max_muxing_queue_size', '4096'
    );

    if (!hasAudio) {
      feederArgs.push('-shortest');
    }

    feederArgs.push(
      '-output_ts_offset', offsetStr,
      '-f', 'mpegts',
      'pipe:1'
    );

    let feeder: ChildProcess;
    try {
      feeder = spawn('ffmpeg', feederArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (spawnErr: any) {
      console.error(`[FFmpeg Feeder] Failed to spawn clip feeder:`, spawnErr.message);
      return;
    }

    item.feederChild = feeder;

    feeder.stdout?.on('error', () => {});
    if (masterChild.stdin && !masterChild.stdin.destroyed) {
      feeder.stdout?.pipe(masterChild.stdin, { end: false });
    }

    feeder.stderr?.on('data', (data) => {
      if (item.feederChild !== feeder) return;
      const text = data.toString();
      const fpsMatch = text.match(/fps=\s*([\d.]+)/);
      const bitrateMatch = text.match(/bitrate=\s*([\d.]+)kbits\/s/);
      if (fpsMatch) item.stats.fps = parseFloat(fpsMatch[1]);
      if (bitrateMatch) item.stats.bitrateKbps = parseFloat(bitrateMatch[1]);
      if (/error|invalid|cannot|failed|too many packets/i.test(text)) {
        const lines = text.split('\n').filter(Boolean);
        item.recentStderr.push(...lines);
        if (item.recentStderr.length > 50) {
          item.recentStderr = item.recentStderr.slice(-50);
        }
      }
    });

    feeder.on('error', (err) => {
      if (item.feederChild !== feeder) return;
      console.warn(`[FFmpeg Feeder] Clip feeder error for track #${trackIdx + 1}:`, err.message);
    });

    feeder.on('close', (code) => {
      // Ignore if feeder was replaced (e.g., stream stopped or restarted)
      if (item.feederChild !== feeder) return;
      item.feederChild = undefined;

      if (item.child !== masterChild) return;
      if (item.stats.state === 'stopped' || item.stats.state === 'crashed') return;
      if (!masterChild.stdin || masterChild.stdin.destroyed || !masterChild.stdin.writable) return;

      const elapsedSec = (Date.now() - trackStartMs) / 1000;
      const latestPaths = (item.config.videoPaths || []).filter(v => typeof v === 'string' && fs.existsSync(v));
      if (latestPaths.length === 0) return;

      if (code === 0) {
        item.consecutiveFeederFailures = 0;
        const advanceDur = clipDuration > 0 ? Math.max(clipDuration, elapsedSec) : Math.max(elapsedSec, 1);
        item.cumulativeTsOffset += advanceDur + 0.05;
      } else {
        item.consecutiveFeederFailures += 1;
        console.warn(`[FFmpeg Feeder] Track #${trackIdx + 1} exited with code ${code}; advancing queue.`);
        item.cumulativeTsOffset += Math.max(elapsedSec, 0.5) + 0.05;
        if (item.consecutiveFeederFailures >= Math.max(latestPaths.length * 2, 3)) {
          console.error(`[FFmpeg Feeder] Too many consecutive clip failures for stream ${streamId}; halting.`);
          try { masterChild.stdin?.end(); } catch {}
          return;
        }
      }

      // Advance cleanly to next video in playlist, and loop back to Track 0 after the last video finishes
      item.currentTrackIndex = (trackIdx + 1) % latestPaths.length;
      this.spawnClipFeeder(streamId, masterChild);
    });
  }

  private async launchProcess(config: StreamConfig): Promise<StreamProcessStats> {
    const item = this.processes.get(config.streamId);
    if (!item) throw new Error('Stream configuration not found');

    // 1. Verify FFmpeg binary is installed on the host
    if (!this.checkFfmpeg()) {
      const errorMsg = 'FFmpeg binary is not installed on this server. Live streaming requires FFmpeg installed in system PATH (e.g. sudo apt install ffmpeg).';
      console.error(`[FFmpeg] Cannot start stream "${config.title}": ${errorMsg}`);
      item.stats.state = 'crashed';
      item.stats.pid = null;
      item.stats.fps = 0;
      item.stats.bitrateKbps = 0;
      item.stats.lastError = errorMsg;
      throw new Error(errorMsg);
    }

    // 2. Decrypt YouTube Stream Key strictly in memory
    let plainStreamKey = '';
    try {
      plainStreamKey = decryptStreamKey(
        config.encryptedStreamKey,
        config.streamKeyIv,
        config.streamKeyAuthTag
      );
    } catch (err: any) {
      const errorMsg = `Failed to decrypt stream key: ${err.message}`;
      item.stats.state = 'crashed';
      item.stats.pid = null;
      item.stats.lastError = errorMsg;
      throw new Error(errorMsg);
    }

    if (!plainStreamKey || plainStreamKey.trim() === '') {
      const errorMsg = 'Valid YouTube RTMP Stream Key is required.';
      item.stats.state = 'crashed';
      item.stats.pid = null;
      item.stats.lastError = errorMsg;
      throw new Error(errorMsg);
    }

    // Stop any stale or conflicting stream process targeting the same YouTube RTMP stream key
    for (const [existingId, existingItem] of this.processes.entries()) {
      if (existingId !== config.streamId && (existingItem.stats.state === 'running' || existingItem.stats.state === 'starting')) {
        try {
          const otherKey = decryptStreamKey(
            existingItem.config.encryptedStreamKey,
            existingItem.config.streamKeyIv,
            existingItem.config.streamKeyAuthTag
          );
          if (otherKey && otherKey === plainStreamKey) {
            console.log(`[FFmpeg Session Isolation] Terminating conflicting previous stream worker ${existingId} using the same RTMP stream key.`);
            await this.stopStream(existingId);
          }
        } catch {}
      }
    }

    // 3. Construct and sanitize RTMP target URL safely (RTMP_URL + "/" + Stream_Key)
    let baseRtmpUrl = (config.streamUrl || 'rtmp://a.rtmp.youtube.com/live2').trim().replace(/\/+$/, '');
    let cleanStreamKey = plainStreamKey.trim();

    // Backward compatibility: If legacy data had the full RTMP URL inside streamKey
    if (cleanStreamKey.startsWith('rtmp://') || cleanStreamKey.startsWith('rtmps://')) {
      const lastSlashIdx = cleanStreamKey.lastIndexOf('/');
      if (lastSlashIdx !== -1 && lastSlashIdx < cleanStreamKey.length - 1) {
        baseRtmpUrl = cleanStreamKey.substring(0, lastSlashIdx).replace(/\/+$/, '');
        cleanStreamKey = cleanStreamKey.substring(lastSlashIdx + 1);
      }
    } else {
      // Clean accidental leading slash from stream key
      cleanStreamKey = cleanStreamKey.replace(/^\/+/, '');
    }

    if (!baseRtmpUrl.startsWith('rtmp://') && !baseRtmpUrl.startsWith('rtmps://')) {
      const errorMsg = 'Invalid RTMP URL. URL must start with rtmp:// or rtmps://';
      item.stats.state = 'crashed';
      item.stats.pid = null;
      item.stats.lastError = errorMsg;
      throw new Error(errorMsg);
    }

    if (!cleanStreamKey) {
      const errorMsg = 'Valid YouTube RTMP Stream Key is required.';
      item.stats.state = 'crashed';
      item.stats.pid = null;
      item.stats.lastError = errorMsg;
      throw new Error(errorMsg);
    }

    // Modern Bulletproof Ingestion Bridge:
    let activePrimaryTarget = `${baseRtmpUrl}/${cleanStreamKey}`;
    if (baseRtmpUrl.includes('youtube.com')) {
      const ytHost = baseRtmpUrl.includes('b.rtmp.youtube.com') ? 'b.rtmp.youtube.com' : 'a.rtmp.youtube.com';
      try {
        if (item.localBridge) {
          try { item.localBridge.close(); } catch {}
          item.localBridge = undefined;
        }
        if (!item.activeBridgeSockets) {
          item.activeBridgeSockets = new Set();
        }
        const bridgeSockets = item.activeBridgeSockets;
        const bridge = net.createServer((clientSock) => {
          bridgeSockets.add(clientSock);
          const upstream = tls.connect({
            host: ytHost,
            port: 443,
            rejectUnauthorized: false
          }, () => {
            clientSock.pipe(upstream);
            upstream.pipe(clientSock);
          });
          bridgeSockets.add(upstream);
          const cleanupSockets = () => {
            bridgeSockets.delete(clientSock);
            bridgeSockets.delete(upstream);
          };
          upstream.on('close', cleanupSockets);
          clientSock.on('close', cleanupSockets);
          upstream.on('error', (uErr) => {
            console.warn(`[RTMP Bridge] Upstream TLS notice (${ytHost}:443):`, uErr.message);
            cleanupSockets();
            clientSock.destroy();
          });
          clientSock.on('error', () => {
            cleanupSockets();
            upstream.destroy();
          });
        });

        await new Promise<void>((resolveServer) => {
          bridge.listen(0, '127.0.0.1', () => resolveServer());
        });

        const port = (bridge.address() as net.AddressInfo).port;
        activePrimaryTarget = `rtmp://127.0.0.1:${port}/live2/${cleanStreamKey}`;
        item.localBridge = bridge;
        console.log(`[RTMP Bridge] Active local TLS relay established on port ${port} -> ${ytHost}:443`);
      } catch (bridgeErr: any) {
        console.warn('[RTMP Bridge] Could not establish local bridge, falling back to direct URL:', bridgeErr.message);
      }
    }

    // 4. Validate local video files on disk
    const rawVideoPaths = (config.videoPaths || []).filter(v => typeof v === 'string' && fs.existsSync(v));
    if (rawVideoPaths.length === 0) {
      const errorMsg = 'No valid video files found on disk for this stream playlist. Please upload MP4 video files.';
      item.stats.state = 'crashed';
      item.stats.pid = null;
      item.stats.lastError = errorMsg;
      throw new Error(errorMsg);
    }

    // Ensure all videos have valid, standardized audio tracks so transitions never drop audio
    const validVideoPaths = rawVideoPaths.map(v => this.ensureVideoAudioTrack(v));
    item.config.videoPaths = validVideoPaths;
    item.stats.totalTracks = validVideoPaths.length;

    const initialIdx = typeof item.config.initialTrackIndex === 'number' && item.config.initialTrackIndex >= 0
      ? item.config.initialTrackIndex % validVideoPaths.length
      : 0;
    item.currentTrackIndex = initialIdx;
    item.stats.currentTrackIndex = initialIdx;
    item.cumulativeTsOffset = 0;
    item.consecutiveFeederFailures = 0;

    // Keep concat manifest file updated for reference/diagnostics
    const tempDir = path.join(os.tmpdir(), 'streamjoin_concat');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const concatPath = path.join(tempDir, `stream_${config.streamId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.txt`);
    this.writeConcatFile(concatPath, validVideoPaths);
    item.concatFilePath = concatPath;

    let ffmpegArgs: string[];
    const commonMasterInputArgs = [
      '-fflags', '+genpts',
      '-analyzeduration', '2000000',
      '-probesize', '2000000',
      '-f', 'mpegts',
      '-i', 'pipe:0',
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-bsf:a', 'aac_adtstoasc',
      '-map', '0:v:0',
      '-map', '0:a:0?',
      '-max_muxing_queue_size', '4096'
    ];

    let activeBackupTarget = config.backupRtmpUrl ? config.backupRtmpUrl.trim() : '';
    if (config.isDualStream && activeBackupTarget) {
      if (activeBackupTarget.includes('youtube.com')) {
        const ytBackupHost = activeBackupTarget.includes('b.rtmp.youtube.com') ? 'b.rtmp.youtube.com' : 'a.rtmp.youtube.com';
        try {
          if (item.localBackupBridge) {
            try { item.localBackupBridge.close(); } catch {}
            item.localBackupBridge = undefined;
          }
          if (!item.activeBridgeSockets) {
            item.activeBridgeSockets = new Set();
          }
          const backupSockets = item.activeBridgeSockets;
          const backupBridge = net.createServer((clientSock) => {
            backupSockets.add(clientSock);
            const upstream = tls.connect({
              host: ytBackupHost,
              port: 443,
              rejectUnauthorized: false
            }, () => {
              clientSock.pipe(upstream);
              upstream.pipe(clientSock);
            });
            backupSockets.add(upstream);
            const cleanupSockets = () => {
              backupSockets.delete(clientSock);
              backupSockets.delete(upstream);
            };
            upstream.on('close', cleanupSockets);
            clientSock.on('close', cleanupSockets);
            upstream.on('error', () => {
              cleanupSockets();
              clientSock.destroy();
            });
            clientSock.on('error', () => {
              cleanupSockets();
              upstream.destroy();
            });
          });

          await new Promise<void>((resolveServer) => {
            backupBridge.listen(0, '127.0.0.1', () => resolveServer());
          });

          const bPort = (backupBridge.address() as net.AddressInfo).port;
          const parts = activeBackupTarget.split('/');
          const bKey = parts[parts.length - 1];
          activeBackupTarget = `rtmp://127.0.0.1:${bPort}/live2/${bKey}`;
          item.localBackupBridge = backupBridge;
        } catch (bErr: any) {
          console.warn('[RTMP Backup Bridge] Error:', bErr.message);
        }
      }
      // Dual RTMP Streaming via tee muxer with standard FLV headers
      const teeOutput = `[f=flv:flvflags=no_duration_filesize:onfail=ignore]${activePrimaryTarget}|[f=flv:flvflags=no_duration_filesize:onfail=ignore]${activeBackupTarget}`;
      ffmpegArgs = [
        ...commonMasterInputArgs,
        '-f', 'tee',
        teeOutput
      ];
    } else {
      // Standard Single RTMP Target to YouTube
      ffmpegArgs = [
        ...commonMasterInputArgs,
        '-f', 'flv',
        '-flvflags', 'no_duration_filesize',
        activePrimaryTarget
      ];
    }

    console.log(`[FFmpeg] Spawning continuous RTMP worker for Stream: ${config.streamId} ("${config.title}") with ${validVideoPaths.length} playlist video(s)`);

    return new Promise<StreamProcessStats>((resolve, reject) => {
      let resolved = false;

      let child: ChildProcess;
      try {
        child = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (err: any) {
        item.stats.state = 'crashed';
        item.stats.pid = null;
        item.stats.lastError = `Failed to spawn FFmpeg: ${err.message}`;
        return reject(new Error(item.stats.lastError));
      }

      child.stdin?.on('error', () => {});
      item.child = child;
      item.recentStderr = [];

      if (!child.pid) {
        item.stats.state = 'crashed';
        item.stats.pid = null;
        item.stats.lastError = 'Failed to acquire Process ID from FFmpeg process.';
        return reject(new Error(item.stats.lastError));
      }

      // Real OS Process ID
      const nowIso = new Date().toISOString();
      item.stats.pid = child.pid;
      item.stats.startedAt = nowIso;
      item.stats.currentTrackStartedAt = nowIso;
      item.stats.uptimeSeconds = 0;
      item.stats.lastError = null;

      // Launch the first clip feeder into masterChild.stdin
      this.spawnClipFeeder(config.streamId, child);

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        const lines = text.split('\n').filter(Boolean);
        item.recentStderr.push(...lines);
        if (item.recentStderr.length > 50) {
          item.recentStderr = item.recentStderr.slice(-50);
        }

        // Parse real bitrate directly from master FFmpeg output if present
        const bitrateMatch = text.match(/bitrate=\s*([\d.]+)kbits\/s/);
        if (bitrateMatch && parseFloat(bitrateMatch[1]) > 0) {
          item.stats.bitrateKbps = parseFloat(bitrateMatch[1]);
        }

        if (text.includes('frame=') && !resolved) {
          resolved = true;
          item.stats.state = 'running';
          console.log(`[FFmpeg Supervisor] Stream "${config.title}" running and sending frames (PID ${child.pid})`);
          resolve({ ...item.stats });
        }
      });

      child.on('error', (err) => {
        // If this child is no longer the active child for this stream, ignore completely
        if (item.child !== child) return;

        console.error(`[FFmpeg] Stream ${config.streamId} process error:`, err);
        this.killFeeder(item);
        item.stats.lastError = err.message;
        item.stats.state = 'crashed';
        item.stats.pid = null;
        item.stats.fps = 0;
        item.stats.bitrateKbps = 0;
        this.handleProcessExit(config.streamId, -1);
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      child.on('close', (code) => {
        // If this child is no longer the active child for this stream, ignore completely
        if (item.child !== child) return;

        console.warn(`[FFmpeg] Stream ${config.streamId} process closed with exit code ${code}`);
        this.killFeeder(item);
        const extractedError = this.extractRecentError(item.recentStderr, code);
        if (code !== 0 && code !== null) {
          item.stats.lastError = extractedError;
        }
        item.stats.pid = null;
        item.stats.fps = 0;
        item.stats.bitrateKbps = 0;
        this.handleProcessExit(config.streamId, code);
        if (!resolved) {
          resolved = true;
          reject(new Error(extractedError));
        }
      });

      // Verify that the process stays alive after launch initialization
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (child.exitCode === null) {
            item.stats.state = 'running';
            console.log(`[FFmpeg Supervisor] Stream "${config.title}" running with real PID ${child.pid}`);
            resolve({ ...item.stats });
          } else {
            this.killFeeder(item);
            item.stats.state = 'crashed';
            item.stats.pid = null;
            const errorMsg = item.stats.lastError || `FFmpeg process exited immediately with code ${child.exitCode}`;
            reject(new Error(errorMsg));
          }
        }
      }, 4000);
    });
  }

  private killFeeder(item: { feederChild?: ChildProcess }) {
    const oldFeeder = item.feederChild;
    item.feederChild = undefined;
    if (oldFeeder) {
      oldFeeder.removeAllListeners('close');
      oldFeeder.removeAllListeners('error');
      oldFeeder.stderr?.removeAllListeners('data');
      try { oldFeeder.stdout?.unpipe?.(); } catch {}
      try { oldFeeder.stdout?.destroy?.(); } catch {}
      try { oldFeeder.stderr?.destroy?.(); } catch {}
      if (!oldFeeder.killed) {
        try {
          if (oldFeeder.pid) process.kill(oldFeeder.pid, 'SIGTERM');
        } catch {}
        try {
          oldFeeder.kill('SIGTERM');
        } catch {}
        setTimeout(() => {
          try {
            if (oldFeeder.exitCode === null && oldFeeder.pid) {
              process.kill(oldFeeder.pid, 'SIGKILL');
            }
          } catch {}
          try {
            if (oldFeeder.exitCode === null) {
              oldFeeder.kill('SIGKILL');
            }
          } catch {}
        }, 200).unref?.();
      }
    }
  }

  private extractRecentError(stderrLines: string[], exitCode: number | null): string {
    if (!stderrLines || stderrLines.length === 0) {
      return `FFmpeg process terminated unexpectedly (exit code: ${exitCode}).`;
    }
    // Search backward for real error message
    for (let i = stderrLines.length - 1; i >= 0; i--) {
      const line = stderrLines[i].trim();
      if (line.match(/Immediate exit requested/i) || line.match(/Exiting normally/i)) {
        continue;
      }
      if (line.match(/Input\/output error/i)) {
        return 'YouTube rejected broadcast stream key or closed connection. Please verify your YouTube Studio Stream Key.';
      }
      if (line.match(/(error|fatal|cannot|invalid|failed|refused|unknown|no such file)/i)) {
        if (line.includes('muxing overhead') || line.includes('Error writing trailer') || line.includes('video:')) {
          continue;
        }
        return this.maskSensitiveOutput(line);
      }
    }
    const filtered = stderrLines.filter(l => 
      !l.includes('frame=') && 
      !l.includes('fps=') && 
      !l.includes('muxing overhead') &&
      !l.includes('video:') &&
      !l.includes('Error writing trailer') &&
      !l.includes('Immediate exit')
    );
    const lastLine = filtered[filtered.length - 1] || stderrLines[stderrLines.length - 1] || 'Process terminated';
    return this.maskSensitiveOutput(`FFmpeg process message (code ${exitCode}): ${lastLine}`);
  }

  private maskSensitiveOutput(text: string): string {
    if (!text) return '';
    return text
      .replace(/(rtmps?:\/\/[^\s\/]+\/[^\s\/]+\/)([^\s\?\&]+)/gi, '$1[PROTECTED_STREAM_KEY]')
      .replace(/(live2\/)([\w-]+)/gi, '$1[PROTECTED_STREAM_KEY]')
      .replace(/(\?key=)([\w-]+)/gi, '$1[PROTECTED_STREAM_KEY]');
  }

  private handleProcessExit(streamId: string, exitCode: number | null) {
    const item = this.processes.get(streamId);
    if (!item) return;

    this.killFeeder(item);

    if (item.stats.state === 'stopped' || item.stats.state === 'starting') {
      return; // Normal intentional user stop or starting a new worker
    }

    item.stats.pid = null;
    item.stats.fps = 0;
    item.stats.bitrateKbps = 0;

    const errorMsg = item.stats.lastError || '';
    if (errorMsg.includes('Immediate exit requested') || exitCode === 255) {
      return; // Intentional stop signal
    }

    const isFatalAuthOrIo = errorMsg.includes('Input/output') ||
                            errorMsg.includes('rejected') ||
                            errorMsg.includes('invalid') ||
                            errorMsg.includes('Authentication') ||
                            errorMsg.includes('Connection refused') ||
                            item.stats.uptimeSeconds < 4;

    // Do NOT loop reconnect if the stream key was rejected by YouTube or connection failed immediately on startup
    if (isFatalAuthOrIo || item.stats.restartAttempts >= 3 || exitCode === 0) {
      if (item.localBridge) {
        try { item.localBridge.close(); } catch {}
        item.localBridge = undefined;
      }
      if (item.localBackupBridge) {
        try { item.localBackupBridge.close(); } catch {}
        item.localBackupBridge = undefined;
      }
      item.stats.state = 'crashed';
      if (!item.stats.lastError) {
        item.stats.lastError = `FFmpeg stream halted (exit code ${exitCode}).`;
      }
      console.info(`[FFmpeg Supervisor] Stream ${streamId} broadcast stopped: ${item.stats.lastError}`);
      if (this.onStreamHaltedCallback) {
        try {
          this.onStreamHaltedCallback(streamId, item.stats.lastError);
        } catch (cbErr: any) {
          console.warn('[StreamManager] Notice in onStreamHaltedCallback:', cbErr.message);
        }
      }
      return;
    }

    item.stats.restartAttempts += 1;
    item.stats.state = 'reconnecting';
    const delayMs = 3000 * item.stats.restartAttempts;
    console.log(`[FFmpeg Auto-Reconnect] Stream ${streamId} disconnected. Attempting reconnect #${item.stats.restartAttempts} in ${delayMs / 1000}s...`);

    item.reconnectTimer = setTimeout(() => {
      this.launchProcess(item.config).catch(err => {
        console.warn(`[FFmpeg Auto-Reconnect] Reconnect #${item.stats.restartAttempts} failed:`, err.message);
      });
    }, delayMs);
  }

  public async stopStream(streamId: string): Promise<boolean> {
    const existingStop = this.stopPromises.get(streamId);
    if (existingStop) {
      return existingStop;
    }

    const stopPromise = (async (): Promise<boolean> => {
      const item = this.processes.get(streamId);
      if (!item) return true;

      item.stats.state = 'stopped';
      item.stats.pid = null;
      item.stats.fps = 0;
      item.stats.bitrateKbps = 0;
      item.stats.uptimeSeconds = 0;

      if (item.intervalTimer) {
        clearInterval(item.intervalTimer);
        item.intervalTimer = undefined;
      }

      if (item.reconnectTimer) {
        clearTimeout(item.reconnectTimer);
        item.reconnectTimer = undefined;
      }

      // 1. Stop active clip feeder immediately so playlist does not advance or wait
      this.killFeeder(item);

      // 2. Immediately terminate all active RTMP / TLS sockets to disconnect YouTube right away
      if (item.activeBridgeSockets) {
        for (const sock of Array.from(item.activeBridgeSockets)) {
          try { sock.destroy(); } catch {}
        }
        item.activeBridgeSockets.clear();
      }

      if (item.localBridge) {
        try { item.localBridge.close(); } catch {}
        item.localBridge = undefined;
      }
      if (item.localBackupBridge) {
        try { item.localBackupBridge.close(); } catch {}
        item.localBackupBridge = undefined;
      }

      // 3. Immediately terminate master FFmpeg process
      const oldChild = item.child;
      item.child = undefined;

      if (oldChild) {
        try { oldChild.stdin?.end(); } catch {}
        try { oldChild.stdin?.destroy(); } catch {}
      }

      if (oldChild && oldChild.exitCode === null) {
        oldChild.removeAllListeners('close');
        oldChild.removeAllListeners('error');
        oldChild.removeAllListeners('exit');
        oldChild.stderr?.removeAllListeners('data');

        const childPid = oldChild.pid;
        try {
          if (childPid) process.kill(childPid, 'SIGTERM');
        } catch {}
        try {
          oldChild.kill('SIGTERM');
        } catch {}

        await new Promise<void>((resolve) => {
          if (oldChild.exitCode !== null || oldChild.signalCode !== null) {
            return resolve();
          }
          const timer = setTimeout(() => {
            try {
              if (oldChild.exitCode === null && oldChild.signalCode === null && childPid) {
                process.kill(childPid, 'SIGKILL');
              }
            } catch {}
            try {
              if (oldChild.exitCode === null && oldChild.signalCode === null) {
                oldChild.kill('SIGKILL');
              }
            } catch {}
            resolve();
          }, 300);

          oldChild.once('close', () => {
            clearTimeout(timer);
            resolve();
          });
        });
      }

      if (item.concatFilePath && fs.existsSync(item.concatFilePath)) {
        try {
          fs.unlinkSync(item.concatFilePath);
        } catch {}
      }

      console.log(`[FFmpeg Supervisor] Stream ${streamId} stopped and RTMP connection disconnected immediately.`);
      return true;
    })().finally(() => {
      this.stopPromises.delete(streamId);
    });

    this.stopPromises.set(streamId, stopPromise);
    return stopPromise;
  }

  public async updateConcatPlaylist(streamId: string, videoPaths: string[]): Promise<boolean> {
    const item = this.processes.get(streamId);
    if (!item) return false;
    try {
      const rawVideoPaths = (videoPaths || []).filter(v => typeof v === 'string' && fs.existsSync(v));
      if (rawVideoPaths.length === 0) return false;
      const validVideoPaths = rawVideoPaths.map(v => this.ensureVideoAudioTrack(v));
      item.config.videoPaths = validVideoPaths;
      item.stats.totalTracks = validVideoPaths.length;

      if (item.concatFilePath) {
        this.writeConcatFile(item.concatFilePath, validVideoPaths);
      }
      console.log(`[FFmpeg] Dynamic playlist updated for stream ${streamId} with ${validVideoPaths.length} video(s).`);
      return true;
    } catch (e: any) {
      console.warn('[FFmpeg] Error updating concat playlist:', e.message);
      return false;
    }
  }

  public async restartStream(streamId: string, newVideoPaths?: string[], startTrackIndex: number = 0): Promise<StreamProcessStats> {
    const item = this.processes.get(streamId);
    if (!item) throw new Error(`Stream ${streamId} is not registered`);

    await this.stopStream(streamId);
    item.stats.restartAttempts = 0;
    item.stats.state = 'starting';
    item.stats.lastError = null;
    item.config.initialTrackIndex = startTrackIndex;
    if (newVideoPaths && newVideoPaths.length > 0) {
      item.config.videoPaths = newVideoPaths;
    }
    return this.launchProcess(item.config);
  }

  public getStreamStats(streamId: string): StreamProcessStats | null {
    const item = this.processes.get(streamId);
    return item ? { ...item.stats } : null;
  }

  public getAllActiveProcesses(): StreamProcessStats[] {
    return Array.from(this.processes.values()).map(p => ({ ...p.stats }));
  }

  private startSupervisorHeartbeat() {
    setInterval(() => {
      this.processes.forEach((item, streamId) => {
        if (item.stats.state === 'running') {
          if (item.child && !item.child.killed && item.child.exitCode === null) {
            item.stats.uptimeSeconds += 5;
          } else {
            item.stats.state = 'crashed';
            item.stats.pid = null;
            item.stats.fps = 0;
            item.stats.bitrateKbps = 0;
            if (this.onStreamHaltedCallback) {
              try {
                this.onStreamHaltedCallback(streamId, item.stats.lastError || 'Process terminated');
              } catch {}
            }
          }
        }
      });
    }, 5000);
  }

  public async recoverActiveStreams(streamsToRecover: StreamConfig[], onFail?: (streamId: string, error: string) => Promise<void>) {
    if (!this.checkFfmpeg()) {
      console.log('[FFmpeg Supervisor] Host system has no FFmpeg binary installed. No background streams recovered.');
      return;
    }
    console.log(`[FFmpeg Supervisor] Checking system recovery for ${streamsToRecover.length} active streams...`);
    for (const config of streamsToRecover) {
      try {
        await this.startStream(config);
        console.log(`[FFmpeg Supervisor] Successfully recovered live stream: ${config.title} (${config.streamId})`);
      } catch (err: any) {
        console.warn(`[FFmpeg Supervisor] Stream recovery skipped for ${config.streamId}: ${err.message}`);
        if (onFail) {
          await onFail(config.streamId, err.message).catch(() => {});
        }
      }
    }
  }
}
