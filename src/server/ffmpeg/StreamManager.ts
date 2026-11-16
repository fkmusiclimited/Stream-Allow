import { spawn, ChildProcess, execSync, execFileSync, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import { decryptStreamKey } from '../utils/crypto';

const execFileAsync = promisify(execFile);

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
  bitrate?: string;
  videoBitrateKbps?: number;
  fps?: number;
  loop?: boolean;
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

export interface ResolvedEncodingProfile {
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
  gop: number;
}

/**
 * Parses resolution & bitrate settings (e.g. "1080p60", "720p", "6000 kbps")
 * into YouTube Live compliant H.264/AAC parameters with 2-second keyframe interval.
 */
export function parseStreamEncodingProfile(
  resolution?: string,
  bitrateStr?: string,
  fpsOverride?: number,
  bitrateOverrideKbps?: number
): ResolvedEncodingProfile {
  const resLower = String(resolution || '1080p60').toLowerCase().trim();

  let width = 1920;
  let height = 1080;
  if (resLower.includes('2160') || resLower.includes('4k')) {
    width = 3840;
    height = 2160;
  } else if (resLower.includes('1440') || resLower.includes('2k')) {
    width = 2560;
    height = 1440;
  } else if (resLower.includes('720')) {
    width = 1280;
    height = 720;
  } else if (resLower.includes('480')) {
    width = 854;
    height = 480;
  }

  let fps = 30;
  if (typeof fpsOverride === 'number' && fpsOverride >= 15 && fpsOverride <= 60) {
    fps = Math.round(fpsOverride);
  } else if (resLower.includes('60')) {
    fps = 60;
  }

  let bitrateKbps = width >= 3840 ? 14000 : width >= 2560 ? 9000 : width >= 1920 ? (fps >= 60 ? 6000 : 4500) : (fps >= 60 ? 4000 : 3000);
  if (typeof bitrateOverrideKbps === 'number' && Number.isFinite(bitrateOverrideKbps) && bitrateOverrideKbps > 0) {
    bitrateKbps = Math.round(bitrateOverrideKbps);
  } else if (bitrateStr) {
    const cleaned = bitrateStr.replace(/,/g, '');
    const match = cleaned.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const parsed = parseFloat(match[1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        bitrateKbps = bitrateStr.toLowerCase().includes('mbps') ? Math.round(parsed * 1000) : Math.round(parsed);
      }
    }
  }

  bitrateKbps = Math.max(500, Math.min(25000, bitrateKbps));
  const gop = fps * 2; // YouTube Live requires keyframe interval <= 4s (2s recommended)

  return { width, height, fps, bitrateKbps, gop };
}

/**
 * Safely combines an RTMP/RTMPS ingest URL with a stream key, preserving paths and query parameters
 * (such as ?backup=1 on YouTube backup ingest endpoints).
 */
export function buildRtmpPublishTarget(rawServerUrl: string, rawStreamKey: string, allowEmbeddedKey: boolean = false): string {
  let serverUrl = (rawServerUrl || 'rtmps://a.rtmps.youtube.com/live2').trim();
  let streamKey = (rawStreamKey || '').trim();

  // Backward compatibility: if legacy data placed full RTMP URL inside streamKey
  if (streamKey.startsWith('rtmp://') || streamKey.startsWith('rtmps://')) {
    try {
      const keyAsUrl = new URL(streamKey);
      const segs = keyAsUrl.pathname.split('/').filter(Boolean);
      if (segs.length >= 2) {
        streamKey = segs.pop()!;
        keyAsUrl.pathname = '/' + segs.join('/');
        serverUrl = keyAsUrl.toString().replace(/\/+$/, '');
      }
    } catch {
      const lastSlashIdx = streamKey.lastIndexOf('/');
      if (lastSlashIdx !== -1 && lastSlashIdx < streamKey.length - 1) {
        serverUrl = streamKey.substring(0, lastSlashIdx).replace(/\/+$/, '');
        streamKey = streamKey.substring(lastSlashIdx + 1);
      }
    }
  } else {
    streamKey = streamKey.replace(/^\/+/, '');
  }

  if (!serverUrl.startsWith('rtmp://') && !serverUrl.startsWith('rtmps://')) {
    throw new Error('Invalid RTMP URL. URL must start with rtmp:// or rtmps://');
  }

  let parsed: URL;
  try {
    parsed = new URL(serverUrl);
  } catch {
    throw new Error('Malformed RTMP ingest URL.');
  }

  // Normalize accidental rtmps://a.rtmp.youtube.com -> rtmps://a.rtmps.youtube.com (valid TLS cert CN)
  if (parsed.protocol === 'rtmps:') {
    if (parsed.hostname === 'a.rtmp.youtube.com') parsed.hostname = 'a.rtmps.youtube.com';
    if (parsed.hostname === 'b.rtmp.youtube.com') parsed.hostname = 'b.rtmps.youtube.com';
  }

  const pathSegments = parsed.pathname.split('/').filter(Boolean);
  const lastSeg = pathSegments[pathSegments.length - 1] || '';

  // For secondary/backup targets that already carry their own stream key (e.g. .../live2/other-key), preserve it
  const hasOwnKeyAlready = allowEmbeddedKey && pathSegments.length >= 2 && !['live2', 'live', 'rtmp', 'app', 'stream'].includes(lastSeg.toLowerCase());

  if (!hasOwnKeyAlready) {
    if (!streamKey) {
      throw new Error('Valid YouTube RTMP Stream Key is required.');
    }
    if (lastSeg !== streamKey) {
      pathSegments.push(streamKey);
    }
    parsed.pathname = '/' + pathSegments.join('/');
  }

  return parsed.toString();
}

function probeTcpPort(host: string, port: number, timeoutMs: number = 700): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port, timeout: timeoutMs }, () => {
      sock.destroy();
      resolve(true);
    });
    sock.on('timeout', () => {
      sock.destroy();
      resolve(false);
    });
    sock.on('error', () => {
      sock.destroy();
      resolve(false);
    });
  });
}

/**
 * Ensures YouTube RTMP targets work in both VPS environments (port 1935 open) and cloud containers
 * (port 1935 blocked -> automatically upgrades to native FFmpeg RTMPS on port 443).
 */
export async function resolveReachableRtmpTarget(targetUrl: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return targetUrl;
  }

  const host = parsed.hostname.toLowerCase();
  const isYoutube = host.endsWith('.youtube.com') || host === 'youtube.com';
  if (!isYoutube) {
    return targetUrl;
  }

  // Always map YouTube rtmps:// to *.rtmps.youtube.com for proper TLS SNI & certificate match
  if (parsed.protocol === 'rtmps:') {
    if (host === 'a.rtmp.youtube.com') parsed.hostname = 'a.rtmps.youtube.com';
    if (host === 'b.rtmp.youtube.com') parsed.hostname = 'b.rtmps.youtube.com';
    return parsed.toString();
  }

  // For rtmp:// to YouTube, probe port 1935 briefly; if blocked, upgrade directly to native RTMPS over port 443
  if (parsed.protocol === 'rtmp:') {
    const port = parsed.port ? parseInt(parsed.port, 10) : 1935;
    const portOpen = await probeTcpPort(parsed.hostname, port, 700);
    if (!portOpen) {
      parsed.protocol = 'rtmps:';
      parsed.port = '';
      if (host === 'a.rtmp.youtube.com') parsed.hostname = 'a.rtmps.youtube.com';
      else if (host === 'b.rtmp.youtube.com') parsed.hostname = 'b.rtmps.youtube.com';
      else if (!host.includes('.rtmps.')) parsed.hostname = 'a.rtmps.youtube.com';
      console.log(`[RTMP Network] TCP:${port} unavailable for ${host}; using native YouTube RTMPS on ${parsed.hostname}:443`);
    }
  }

  return parsed.toString();
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
    cancelStartup?: (reason: string) => void;
    recentStderr: string[];
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

  private async probeClipDetails(videoPath: string): Promise<{
    duration: number | null;
    hasAudio: boolean;
    width: number;
    height: number;
    fps: number;
  }> {
    let duration: number | null = null;
    let hasAudio = false;
    let width = 1920;
    let height = 1080;
    let fps = 30;
    if (!fs.existsSync(videoPath)) {
      return { duration, hasAudio, width, height, fps };
    }
    try {
      const { stdout } = await execFileAsync(
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
      );
      const parsed = JSON.parse(stdout);
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

  public ensureVideoAudioTrack(videoPath: string): string {
    return videoPath;
  }

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

  public writeConcatFile(concatFilePath: string, videoPaths: string[]) {
    const lines = ['ffconcat version 1.0'];
    for (const v of videoPaths) {
      lines.push(`file '${v.replace(/'/g, "'\\''")}'`);
    }
    fs.writeFileSync(concatFilePath, lines.join('\n') + '\n', 'utf8');
  }

  public async startStream(config: StreamConfig): Promise<StreamProcessStats> {
    if (this.processes.has(config.streamId)) {
      const existing = this.processes.get(config.streamId)!;
      if (existing.stats.state === 'running' && existing.child && !existing.child.killed && existing.stats.pid) {
        return { ...existing.stats };
      }
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

  private async spawnClipFeeder(streamId: string, masterChild: ChildProcess) {
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
    const clipInfo = await this.probeClipDetails(clipPath);

    // Re-verify stream is still active after async probe
    const latestItem = this.processes.get(streamId);
    if (!latestItem || latestItem.child !== masterChild || latestItem.stats.state === 'stopped' || latestItem.stats.state === 'crashed') {
      return;
    }
    if (!masterChild.stdin || masterChild.stdin.destroyed || !masterChild.stdin.writable) {
      return;
    }

    const clipDuration = clipInfo.duration || 0;
    const hasAudio = clipInfo.hasAudio;
    const isHeavySource = clipInfo.width > 1920 || clipInfo.height > 1080 || clipInfo.fps > 35;
    const encoding = parseStreamEncodingProfile(
      item.config.resolution,
      item.config.bitrate,
      item.config.fps,
      item.config.videoBitrateKbps
    );

    const offsetStr = item.cumulativeTsOffset.toFixed(3);
    const trackStartMs = Date.now();
    item.stats.currentTrackStartedAt = new Date(trackStartMs).toISOString();

    console.log(
      `[FFmpeg Playlist] Stream "${item.config.title}" playing Track #${trackIdx + 1}/${validPaths.length}: ${path.basename(clipPath)} (${clipInfo.width}x${clipInfo.height}@${clipInfo.fps}fps -> ${encoding.width}x${encoding.height}@${encoding.fps}fps ${encoding.bitrateKbps}kbps, audio=${hasAudio}, offset=${offsetStr}s)`
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
      '-vf', `fps=${encoding.fps},scale=${encoding.width}:${encoding.height}:force_original_aspect_ratio=decrease:flags=fast_bilinear,pad=${encoding.width}:${encoding.height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,format=yuv420p`,
      '-c:v', 'libx264',
      '-preset', isHeavySource ? 'superfast' : 'veryfast'
    );

    if (isHeavySource) {
      feederArgs.push('-tune', 'zerolatency', '-profile:v', 'main', '-level:v', '4.2');
    } else {
      feederArgs.push('-profile:v', 'high', '-level:v', '4.2', '-bf', '2');
    }

    feederArgs.push(
      '-b:v', `${encoding.bitrateKbps}k`,
      '-minrate', `${encoding.bitrateKbps}k`,
      '-maxrate', `${encoding.bitrateKbps}k`,
      '-bufsize', `${encoding.bitrateKbps * 2}k`,
      '-pix_fmt', 'yuv420p',
      '-g', String(encoding.gop),
      '-keyint_min', String(encoding.gop),
      '-sc_threshold', '0',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2',
      '-af', 'aresample=async=1:first_pts=0,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo',
      '-map', '0:v:0',
      '-map', hasAudio ? '0:a:0' : '1:a:0',
      '-max_muxing_queue_size', '4096'
    );

    if (!hasAudio) {
      feederArgs.push('-shortest');
    }

    feederArgs.push(
      '-output_ts_offset', offsetStr,
      '-mpegts_flags', '+resend_headers',
      '-f', 'mpegts',
      'pipe:1'
    );

    let feeder: ChildProcess;
    try {
      feeder = spawn('ffmpeg', feederArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (spawnErr: any) {
      console.error('[FFmpeg Feeder] Failed to spawn clip feeder:', spawnErr.message);
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
        item.cumulativeTsOffset += advanceDur + 0.04;
      } else {
        item.consecutiveFeederFailures += 1;
        console.warn(`[FFmpeg Feeder] Track #${trackIdx + 1} exited with code ${code}; advancing queue.`);
        item.cumulativeTsOffset += Math.max(elapsedSec, 0.5) + 0.04;
        if (item.consecutiveFeederFailures >= Math.max(latestPaths.length * 2, 3)) {
          console.error(`[FFmpeg Feeder] Too many consecutive clip failures for stream ${streamId}; halting.`);
          try { masterChild.stdin?.end(); } catch {}
          return;
        }
      }

      const shouldLoop = item.config.loop !== false;
      const nextTrack = trackIdx + 1;
      if (!shouldLoop && nextTrack >= latestPaths.length) {
        console.log(`[FFmpeg Playlist] Single-run playlist completed for stream ${streamId}. Ending broadcast cleanly.`);
        try { masterChild.stdin?.end(); } catch {}
        return;
      }

      item.currentTrackIndex = nextTrack % latestPaths.length;
      this.spawnClipFeeder(streamId, masterChild).catch(() => {});
    });
  }

  private async launchProcess(config: StreamConfig): Promise<StreamProcessStats> {
    const item = this.processes.get(config.streamId);
    if (!item) throw new Error('Stream configuration not found');

    if (!this.checkFfmpeg()) {
      const errorMsg = 'FFmpeg binary is not installed on this server. Live streaming requires FFmpeg installed in system PATH.';
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

    // Stop any conflicting stream worker targeting the same YouTube RTMP stream key
    for (const [existingId, existingItem] of this.processes.entries()) {
      if (existingId !== config.streamId && (existingItem.stats.state === 'running' || existingItem.stats.state === 'starting' || existingItem.stats.state === 'reconnecting')) {
        try {
          const otherKey = decryptStreamKey(
            existingItem.config.encryptedStreamKey,
            existingItem.config.streamKeyIv,
            existingItem.config.streamKeyAuthTag
          );
          if (otherKey && otherKey.trim() === plainStreamKey.trim()) {
            console.log(`[FFmpeg Session Isolation] Terminating conflicting previous stream worker ${existingId} using the same RTMP stream key.`);
            await this.stopStream(existingId);
          }
        } catch {}
      }
    }

    // 3. Build & resolve real RTMP/RTMPS ingestion target(s)
    let rawPrimaryTarget: string;
    try {
      rawPrimaryTarget = buildRtmpPublishTarget(config.streamUrl, plainStreamKey, false);
    } catch (urlErr: any) {
      item.stats.state = 'crashed';
      item.stats.pid = null;
      item.stats.lastError = urlErr.message;
      throw urlErr;
    }

    const activePrimaryTarget = await resolveReachableRtmpTarget(rawPrimaryTarget);
    console.log(`[RTMP Target] Primary push endpoint: ${this.maskSensitiveOutput(activePrimaryTarget)}`);

    let activeBackupTarget = '';
    if (config.isDualStream && config.backupRtmpUrl && config.backupRtmpUrl.trim()) {
      try {
        const rawBackup = buildRtmpPublishTarget(config.backupRtmpUrl.trim(), plainStreamKey, true);
        activeBackupTarget = await resolveReachableRtmpTarget(rawBackup);
        console.log(`[RTMP Target] Backup push endpoint: ${this.maskSensitiveOutput(activeBackupTarget)}`);
      } catch (bErr: any) {
        console.warn('[RTMP Target] Skipping invalid dual-stream backup URL:', bErr.message);
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

    const tempDir = path.join(os.tmpdir(), 'streamjoin_concat');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const concatPath = path.join(tempDir, `stream_${config.streamId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.txt`);
    this.writeConcatFile(concatPath, validVideoPaths);
    item.concatFilePath = concatPath;

    const commonMasterInputArgs = [
      '-fflags', '+genpts',
      '-thread_queue_size', '1024',
      '-analyzeduration', '500000',
      '-probesize', '500000',
      '-f', 'mpegts',
      '-i', 'pipe:0'
    ];

    const perOutputFlvArgs = (target: string): string[] => [
      '-map', '0:v:0',
      '-map', '0:a:0?',
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-bsf:a', 'aac_adtstoasc',
      '-max_muxing_queue_size', '4096',
      '-rw_timeout', '10000000',
      '-f', 'flv',
      '-flvflags', 'no_duration_filesize',
      target
    ];

    const ffmpegArgs: string[] = [
      ...commonMasterInputArgs,
      ...perOutputFlvArgs(activePrimaryTarget),
      ...(activeBackupTarget ? perOutputFlvArgs(activeBackupTarget) : [])
    ];

    console.log(`[FFmpeg] Spawning continuous RTMP worker for Stream: ${config.streamId} ("${config.title}") with ${validVideoPaths.length} playlist video(s)`);

    return new Promise<StreamProcessStats>((resolve, reject) => {
      let resolved = false;
      let startupTimer: NodeJS.Timeout | undefined;

      const finishStartupReject = (err: Error) => {
        if (resolved) return;
        resolved = true;
        if (startupTimer) clearTimeout(startupTimer);
        item.cancelStartup = undefined;
        reject(err);
      };

      item.cancelStartup = (reason: string) => {
        finishStartupReject(new Error(reason));
      };

      let child: ChildProcess;
      try {
        child = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (err: any) {
        item.stats.state = 'crashed';
        item.stats.pid = null;
        item.stats.lastError = `Failed to spawn FFmpeg: ${err.message}`;
        return finishStartupReject(new Error(item.stats.lastError));
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

      const nowIso = new Date().toISOString();
      item.stats.pid = child.pid;
      item.stats.state = 'starting';
      item.stats.startedAt = nowIso;
      item.stats.currentTrackStartedAt = nowIso;
      item.stats.uptimeSeconds = 0;
      item.stats.lastError = null;

      // Launch the first clip feeder into masterChild.stdin
      this.spawnClipFeeder(config.streamId, child).catch(() => {});

      child.stderr?.on('data', (data) => {
        if (item.child !== child) return;
        const text = data.toString();
        const lines = text.split('\n').filter(Boolean);
        item.recentStderr.push(...lines);
        if (item.recentStderr.length > 60) {
          item.recentStderr = item.recentStderr.slice(-60);
        }

        const bitrateMatch = text.match(/bitrate=\s*([\d.]+)kbits\/s/);
        if (bitrateMatch && parseFloat(bitrateMatch[1]) > 0) {
          item.stats.bitrateKbps = parseFloat(bitrateMatch[1]);
        }

        if (text.includes('frame=') && !resolved) {
          resolved = true;
          if (startupTimer) clearTimeout(startupTimer);
          item.cancelStartup = undefined;
          item.stats.state = 'running';
          console.log(`[FFmpeg Supervisor] Stream "${config.title}" connected and pushing frames to YouTube (PID ${child.pid})`);
          resolve({ ...item.stats });
        }
      });

      child.on('error', (err) => {
        if (item.child !== child) return;
        if (startupTimer) clearTimeout(startupTimer);
        console.error(`[FFmpeg] Stream ${config.streamId} process error:`, err);
        this.killFeeder(item);
        item.stats.lastError = err.message;
        item.stats.pid = null;
        item.stats.fps = 0;
        item.stats.bitrateKbps = 0;
        if (!resolved) {
          item.stats.state = 'crashed';
          finishStartupReject(err);
        } else {
          this.handleProcessExit(config.streamId, -1);
        }
      });

      child.on('close', (code) => {
        if (item.child !== child) return;
        if (startupTimer) clearTimeout(startupTimer);

        console.warn(`[FFmpeg] Stream ${config.streamId} process closed with exit code ${code}`);
        this.killFeeder(item);
        const extractedError = this.extractRecentError(item.recentStderr, code);
        if (code !== 0 && code !== null) {
          item.stats.lastError = extractedError;
        }
        item.stats.pid = null;
        item.stats.fps = 0;
        item.stats.bitrateKbps = 0;

        if (!resolved) {
          item.stats.state = 'crashed';
          finishStartupReject(new Error(extractedError));
        } else {
          this.handleProcessExit(config.streamId, code);
        }
      });

      // Wait up to 8s for RTMP handshake + first frame push confirmation
      startupTimer = setTimeout(() => {
        if (resolved) return;
        if (item.child !== child || item.stats.state === 'stopped') {
          return finishStartupReject(new Error('Stream stopped during initialization.'));
        }
        resolved = true;
        item.cancelStartup = undefined;
        if (child.exitCode === null) {
          item.stats.state = 'running';
          console.log(`[FFmpeg Supervisor] Stream "${config.title}" active with PID ${child.pid}`);
          resolve({ ...item.stats });
        } else {
          this.killFeeder(item);
          item.stats.state = 'crashed';
          item.stats.pid = null;
          const errorMsg = item.stats.lastError || this.extractRecentError(item.recentStderr, child.exitCode);
          reject(new Error(errorMsg));
        }
      }, 8000);
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
    const joined = stderrLines.join('\n');
    if (/NetStream\.Publish\.(BadName|Rejected|Denied|Unauthorized)|401 Unauthorized|403 Forbidden/i.test(joined)) {
      return 'YouTube rejected broadcast stream key (NetStream.Publish.Rejected). Please check your YouTube Studio Stream Key.';
    }
    if (/Input\/output error|End of file/i.test(joined) && !/frame=\s*[1-9]\d*/.test(joined)) {
      return 'YouTube rejected broadcast stream key or closed RTMPS connection during handshake. Please verify your YouTube Studio Stream Key and ensure your live event is ready.';
    }
    if (/Connection timed out|Operation timed out|timed out/i.test(joined)) {
      return 'Connection to YouTube RTMP/RTMPS ingest timed out. Please check network/firewall connectivity.';
    }
    if (/Connection refused/i.test(joined)) {
      return 'RTMP connection refused by remote server. Verify your RTMP ingest URL and port.';
    }
    for (let i = stderrLines.length - 1; i >= 0; i--) {
      const line = stderrLines[i].trim();
      if (/Immediate exit requested|Exiting normally|muxing overhead|Error writing trailer|video:/i.test(line)) {
        continue;
      }
      if (/(error|fatal|cannot|invalid|failed|refused|unknown|no such file|tls)/i.test(line)) {
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
      .replace(/(rtmps?:\/\/[^\s\/]+\/[^\s\/\?]+\/)([^\s\?\&]+)/gi, '$1[PROTECTED_STREAM_KEY]')
      .replace(/(live2\/)([\w-]+)/gi, '$1[PROTECTED_STREAM_KEY]')
      .replace(/(\?key=)([\w-]+)/gi, '$1[PROTECTED_STREAM_KEY]');
  }

  private finalizeHaltedStream(streamId: string, reason: string) {
    const item = this.processes.get(streamId);
    if (!item) return;
    item.stats.state = 'crashed';
    item.stats.pid = null;
    item.stats.fps = 0;
    item.stats.bitrateKbps = 0;
    item.stats.lastError = reason;
    console.info(`[FFmpeg Supervisor] Stream ${streamId} broadcast halted: ${reason}`);
    if (this.onStreamHaltedCallback) {
      try {
        this.onStreamHaltedCallback(streamId, reason);
      } catch (cbErr: any) {
        console.warn('[StreamManager] Notice in onStreamHaltedCallback:', cbErr.message);
      }
    }
  }

  private handleProcessExit(streamId: string, exitCode: number | null) {
    const item = this.processes.get(streamId);
    if (!item) return;

    this.killFeeder(item);

    if (item.stats.state === 'stopped') {
      return;
    }

    item.stats.pid = null;
    item.stats.fps = 0;
    item.stats.bitrateKbps = 0;

    const errorMsg = item.stats.lastError || '';

    const isPermanentConfigOrAuthFailure =
      /rejected|BadName|Unauthorized|403 Forbidden|Invalid argument|Invalid data|No such file|Protocol not found|Malformed RTMP/i.test(errorMsg) ||
      (/Connection refused|Authentication|handshake/i.test(errorMsg) && item.stats.uptimeSeconds < 5);

    const maxReconnectAttempts = 5;

    if (isPermanentConfigOrAuthFailure || item.stats.restartAttempts >= maxReconnectAttempts || exitCode === 0) {
      const finalReason = exitCode === 0
        ? 'Broadcast playlist finished cleanly.'
        : (item.stats.lastError || `FFmpeg stream halted (exit code ${exitCode}).`);
      this.finalizeHaltedStream(streamId, finalReason);
      return;
    }

    this.scheduleReconnect(streamId);
  }

  private scheduleReconnect(streamId: string) {
    const item = this.processes.get(streamId);
    if (!item || item.stats.state === 'stopped') return;

    if (item.reconnectTimer) {
      clearTimeout(item.reconnectTimer);
      item.reconnectTimer = undefined;
    }

    item.stats.restartAttempts += 1;
    item.stats.state = 'reconnecting';
    item.config.initialTrackIndex = item.currentTrackIndex;
    const delayMs = Math.min(15000, 3000 * item.stats.restartAttempts);
    console.log(`[FFmpeg Auto-Reconnect] Stream ${streamId} disconnected. Attempting reconnect #${item.stats.restartAttempts}/5 in ${delayMs / 1000}s (track #${item.currentTrackIndex + 1})...`);

    item.reconnectTimer = setTimeout(() => {
      item.reconnectTimer = undefined;
      const latestItem = this.processes.get(streamId);
      if (!latestItem || latestItem.stats.state === 'stopped') return;

      this.launchProcess(latestItem.config).catch((err) => {
        console.warn(`[FFmpeg Auto-Reconnect] Reconnect #${latestItem.stats.restartAttempts} failed:`, err.message);
        if (latestItem.stats.state === 'stopped') return;

        const fatalReject = /rejected|BadName|Unauthorized|Invalid argument|No such file|Malformed RTMP/i.test(err.message || '');
        if (!fatalReject && latestItem.stats.restartAttempts < 5) {
          this.scheduleReconnect(streamId);
        } else {
          this.finalizeHaltedStream(streamId, err.message || 'Auto-reconnect exhausted.');
        }
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

      if (item.cancelStartup) {
        item.cancelStartup('Stream stopped during initialization.');
      }

      // 1. Stop active clip feeder immediately so playlist does not advance or wait
      this.killFeeder(item);

      // 2. Immediately terminate master FFmpeg process & close RTMP/RTMPS socket
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

      console.log(`[FFmpeg Supervisor] Stream ${streamId} stopped and RTMP/RTMPS connection disconnected immediately.`);
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
            // Reset transient reconnect counter after 60s of stable continuous streaming
            if (item.stats.uptimeSeconds >= 60 && item.stats.restartAttempts > 0) {
              item.stats.restartAttempts = 0;
            }
          } else {
            this.finalizeHaltedStream(streamId, item.stats.lastError || 'Process terminated');
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
