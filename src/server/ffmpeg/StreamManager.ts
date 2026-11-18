import { spawn, ChildProcess, execSync, execFileSync, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import { decryptStreamKey } from '../utils/crypto';
import {
  detectHostStreamingCapabilities,
  HostStreamingCapabilities,
  VideoEncoderBackend
} from './HostCapabilities';

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
  encodingMode?: 'passthrough' | 'hardware' | 'software';
  encoderBackend?: VideoEncoderBackend | 'copy';
  effectiveResolution?: string;
  effectiveFps?: number;
  effectiveBitrateKbps?: number;
  capabilityNotice?: string | null;
  droppedFrames?: number;
  dupFrames?: number;
  encodingSpeed?: number;
  stallCount?: number;
  overloadMitigations?: number;
  lastFrameCount?: number;
  lastOutTimeMs?: number;
}

export interface ResolvedEncodingProfile {
  width: number;
  height: number;
  fps: number;
  explicitFps?: boolean;
  bitrateKbps: number;
  audioBitrateKbps: number;
  gop: number;
  label: string;
}

export interface ClipProbeDetails {
  duration: number | null;
  hasAudio: boolean;
  videoCodec: string;
  audioCodec: string;
  pixFmt: string;
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
  mtimeMs: number;
  sizeBytes: number;
}

/**
 * Parses resolution & bitrate settings (360p through 4K UHD 2160p @ 30/60 FPS)
 * into YouTube Live compliant H.264/AAC CBR parameters with 2-second keyframe interval.
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
  } else if (resLower.includes('1080')) {
    width = 1920;
    height = 1080;
  } else if (resLower.includes('720')) {
    width = 1280;
    height = 720;
  } else if (resLower.includes('480')) {
    width = 854;
    height = 480;
  } else if (resLower.includes('360')) {
    width = 640;
    height = 360;
  }

  let fps = 30;
  let explicitFps = false;
  if (typeof fpsOverride === 'number' && fpsOverride >= 15 && fpsOverride <= 60) {
    fps = Math.round(fpsOverride);
    explicitFps = true;
  } else if (/(?:^|[^0-9])60(?:\s*(?:fps|p))?(?:$|[^0-9])/i.test(resLower)) {
    fps = 60;
    explicitFps = true;
  } else if (/(?:^|[^0-9])30(?:\s*(?:fps|p))?(?:$|[^0-9])/i.test(resLower)) {
    fps = 30;
    explicitFps = true;
  } else if (/(?:^|[^0-9])24(?:\s*(?:fps|p))?(?:$|[^0-9])/i.test(resLower)) {
    fps = 24;
    explicitFps = true;
  }

  // YouTube Live official recommended CBR bitrates by resolution & FPS
  let bitrateKbps: number;
  if (width >= 3840) {
    bitrateKbps = fps >= 50 ? 25000 : 18000;
  } else if (width >= 2560) {
    bitrateKbps = fps >= 50 ? 12000 : 9000;
  } else if (width >= 1920) {
    bitrateKbps = fps >= 50 ? 6000 : 4500;
  } else if (width >= 1280) {
    bitrateKbps = fps >= 50 ? 4500 : 3000;
  } else if (width >= 854) {
    bitrateKbps = fps >= 50 ? 1800 : 1200;
  } else {
    bitrateKbps = fps >= 50 ? 1200 : 800;
  }

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

  // Clamp to valid YouTube Live RTMP bounds (400 kbps min for 360p, 51,000 kbps max for 4K60)
  bitrateKbps = Math.max(400, Math.min(51000, bitrateKbps));
  const audioBitrateKbps = width >= 2560 ? 192 : width >= 1920 && fps >= 50 ? 160 : width >= 1280 ? 128 : 96;
  const gop = fps * 2; // Strict 2.0-second keyframe interval required by YouTube Live
  const label = `${height}p${fps}`;

  return { width, height, fps, explicitFps, bitrateKbps, audioBitrateKbps, gop, label };
}

/**
 * Evaluates whether a source clip can use zero-copy H.264 video passthrough (-c:v copy)
 * or requires hardware/CPU re-encoding, and honestly adapts re-encoding tiers to host hardware capacity.
 */
export function resolveAdaptiveEncodingPlan(
  requested: ResolvedEncodingProfile,
  clipInfo: ClipProbeDetails,
  caps: HostStreamingCapabilities,
  activeOtherStreams: number,
  allowZeroCopy: boolean,
  forceSoftwareFallback: boolean = false,
  overloadLevel: number = 0
): {
  mode: 'passthrough' | 'hardware' | 'software';
  backend: VideoEncoderBackend | 'copy';
  profile: ResolvedEncodingProfile;
  preset: string;
  tune?: string;
  threads: number;
  needsScale: boolean;
  needsFpsFilter: boolean;
  notice: string | null;
} {
  const isSourceH264Yuv420 =
    clipInfo.videoCodec === 'h264' &&
    (clipInfo.pixFmt === 'yuv420p' || clipInfo.pixFmt === 'yuvj420p' || clipInfo.pixFmt === '');

  const exactResMatch = clipInfo.width === requested.width && clipInfo.height === requested.height;
  const exactFpsMatch = Math.abs(clipInfo.fps - requested.fps) <= 2 ||
    (!requested.explicitFps && clipInfo.fps >= 24 && clipInfo.fps <= 60);
  const reasonableSourceBitrate = clipInfo.bitrateKbps <= 0 || clipInfo.bitrateKbps <= 51000;

  // 1. Zero-Copy H.264 Passthrough: ideal for pre-encoded 1080p/2K/4K H.264 MP4s (~2-5% CPU, zero quality loss)
  if (allowZeroCopy && isSourceH264Yuv420 && exactResMatch && exactFpsMatch && reasonableSourceBitrate) {
    const passProfile: ResolvedEncodingProfile = {
      width: clipInfo.width,
      height: clipInfo.height,
      fps: clipInfo.fps > 0 ? clipInfo.fps : requested.fps,
      bitrateKbps: clipInfo.bitrateKbps > 400 ? Math.min(51000, clipInfo.bitrateKbps) : requested.bitrateKbps,
      audioBitrateKbps: requested.audioBitrateKbps,
      gop: (clipInfo.fps > 0 ? clipInfo.fps : requested.fps) * 2,
      label: `${clipInfo.height}p${clipInfo.fps || requested.fps}`
    };
    return {
      mode: 'passthrough',
      backend: 'copy',
      profile: passProfile,
      preset: 'copy',
      threads: 1,
      needsScale: false,
      needsFpsFilter: false,
      notice: null
    };
  }

  const backend: VideoEncoderBackend = forceSoftwareFallback ? 'libx264' : caps.hwAccel.preferredBackend;

  if (backend !== 'libx264') {
    return {
      mode: 'hardware',
      backend,
      profile: requested,
      preset: backend === 'nvenc' ? 'p4' : 'fast',
      threads: Math.max(1, Math.floor(caps.cpuCores / Math.max(1, activeOtherStreams + 1))),
      needsScale: !exactResMatch,
      needsFpsFilter: !exactFpsMatch,
      notice: null
    };
  }

  // 3. Software CPU (libx264) Hardware-Aware Capacity Adaptation (prevents freezes/stutter on CPU-only VPS)
  let effective = { ...requested };
  let notice: string | null = null;
  const totalConcurrent = activeOtherStreams + 1;
  const coresPerStream = caps.effectiveCpuCores / totalConcurrent;
  const isHeavySourceDecode = clipInfo.width >= 2560 || clipInfo.height >= 1440;

  if (!caps.supports4KTranscode && effective.width >= 3840) {
    effective = parseStreamEncodingProfile(coresPerStream < 1.5 ? '720p30' : '1080p30', undefined, 30);
    notice = `Host uses CPU-only encoding (${caps.effectiveCpuCores} vCPU, ${(caps.totalMemoryMb / 1024).toFixed(1)} GB RAM, no GPU). Real-time 4K software re-encoding is disabled; adapted to smooth ${effective.label} (${effective.bitrateKbps} kbps).`;
  } else if (!caps.supports2KTranscode && effective.width >= 2560) {
    effective = parseStreamEncodingProfile(coresPerStream < 1.5 ? '720p30' : '1080p30', undefined, 30);
    notice = `Host CPU (${caps.effectiveCpuCores} vCPU, no GPU) adapted 2K software transcode to stable ${effective.label} (${effective.bitrateKbps} kbps) to prevent frame drops.`;
  } else if (effective.width >= 1920 && effective.fps >= 50 && (!caps.supports1080p60Transcode || coresPerStream < 2 || isHeavySourceDecode)) {
    // Strictly disable 1080p60 software transcoding unless host has GPU or >=4 vCPU / sufficient per-stream headroom
    effective = parseStreamEncodingProfile(coresPerStream < 1.2 ? '720p30' : '1080p30', undefined, 30);
    notice = `1080p60 software transcoding disabled on ${caps.effectiveCpuCores} vCPU host (${totalConcurrent} active stream(s)); adapted to safe ${effective.label} (${effective.bitrateKbps} kbps) to prevent micro-freezes.`;
  } else if (coresPerStream < 1.2 && effective.width >= 1920) {
    // Multiple concurrent software streams on 2 vCPU: step down to 720p30 so streams don't thrash
    effective = parseStreamEncodingProfile('720p30', undefined, 30);
    notice = `Adapted concurrent stream to ${effective.label} (${effective.bitrateKbps} kbps) for stable >1.0x encoding across ${totalConcurrent} streams on ${caps.effectiveCpuCores} vCPU.`;
  }

  // Runtime CPU / speed overload safe profile downgrade
  if (overloadLevel >= 1) {
    if (effective.width >= 1920 || effective.fps >= 50) {
      effective = parseStreamEncodingProfile('720p30', undefined, 30);
    }
    if (overloadLevel >= 2) {
      effective = {
        ...effective,
        bitrateKbps: Math.max(1200, Math.round(effective.bitrateKbps * 0.75))
      };
    }
    notice = `Overload protection level ${overloadLevel}: stepped down software profile to ${effective.label} (${effective.bitrateKbps} kbps) for stable real-time >1.0x speed.`;
  }

  // Balanced x264 preset selection (avoid -tune zerolatency which disables lookahead/B-frames and causes scene-cut CPU spikes)
  let preset = 'veryfast';
  const tune: string | undefined = undefined;
  if (effective.width >= 1920) {
    if (overloadLevel > 0 || isHeavySourceDecode || coresPerStream < 1.5) {
      preset = 'ultrafast';
    } else if (caps.effectiveCpuCores >= 4 && effective.fps <= 30) {
      preset = 'veryfast';
    } else {
      preset = 'superfast'; // Safe 1080p30 profile on 2 vCPU with VBV lookahead intact
    }
  } else if (effective.width >= 1280) {
    preset = overloadLevel > 0 || effective.fps >= 50 ? 'superfast' : 'veryfast';
  } else {
    preset = overloadLevel > 0 ? 'superfast' : 'veryfast';
  }

  // Cap threads cleanly on 2 vCPU so feeder x264 doesn't starve master muxer / Node event loop
  const threads = totalConcurrent === 1
    ? (caps.cpuCores <= 2 ? 2 : 0)
    : Math.max(1, Math.floor(caps.cpuCores / totalConcurrent));
  const needsScale = clipInfo.width !== effective.width || clipInfo.height !== effective.height;
  const needsFpsFilter = Math.abs(clipInfo.fps - effective.fps) > 1;

  return {
    mode: 'software',
    backend: 'libx264',
    profile: effective,
    preset,
    tune,
    threads,
    needsScale,
    needsFpsFilter,
    notice
  };
}

/**
 * Safely combines an RTMP/RTMPS ingest URL with a stream key, preserving paths and query parameters
 * (such as ?backup=1 on YouTube backup ingest endpoints).
 */
export function buildRtmpPublishTarget(rawServerUrl: string, rawStreamKey: string, allowEmbeddedKey: boolean = false): string {
  let serverUrl = (rawServerUrl || 'rtmps://a.rtmps.youtube.com/live2').trim();
  let streamKey = (rawStreamKey || '').trim();

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

  if (parsed.protocol === 'rtmps:') {
    if (parsed.hostname === 'a.rtmp.youtube.com') parsed.hostname = 'a.rtmps.youtube.com';
    if (parsed.hostname === 'b.rtmp.youtube.com') parsed.hostname = 'b.rtmps.youtube.com';
  }

  const pathSegments = parsed.pathname.split('/').filter(Boolean);
  const lastSeg = pathSegments[pathSegments.length - 1] || '';

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

function probeTcpPort(host: string, port: number, timeoutMs: number = 900): Promise<boolean> {
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

  if (parsed.protocol === 'rtmps:') {
    if (host === 'a.rtmp.youtube.com') parsed.hostname = 'a.rtmps.youtube.com';
    if (host === 'b.rtmp.youtube.com') parsed.hostname = 'b.rtmps.youtube.com';
    return parsed.toString();
  }

  if (parsed.protocol === 'rtmp:') {
    const port = parsed.port ? parseInt(parsed.port, 10) : 1935;
    const portOpen = await probeTcpPort(parsed.hostname, port, 900);
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

interface ParsedFfmpegProgress {
  frame?: number;
  fps?: number;
  bitrateKbps?: number;
  drop?: number;
  dup?: number;
  speed?: number;
  outTimeMs?: number;
}

function parseFfmpegTimeToMs(timeStr: string): number | undefined {
  const match = timeStr.match(/^(-?)(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/);
  if (!match) return undefined;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = parseInt(match[2], 10);
  const mins = parseInt(match[3], 10);
  const secs = parseFloat(match[4]);
  if (!Number.isFinite(hours) || !Number.isFinite(mins) || !Number.isFinite(secs)) return undefined;
  return sign * Math.round((hours * 3600 + mins * 60 + secs) * 1000);
}

function parseFfmpegProgressChunk(chunkText: string): ParsedFfmpegProgress {
  const result: ParsedFfmpegProgress = {};
  const segments = chunkText.split(/[\r\n]+/).filter(Boolean);
  for (const line of segments) {
    if (!/(frame=|fps=|time=|bitrate=|speed=|drop=|dup=)/.test(line)) continue;
    const frameMatch = line.match(/frame=\s*(\d+)/);
    const fpsMatch = line.match(/fps=\s*([\d.]+)/);
    const bitrateMatch = line.match(/bitrate=\s*([\d.]+)kbits\/s/);
    const dropMatch = line.match(/drop=\s*(\d+)/);
    const dupMatch = line.match(/dup=\s*(\d+)/);
    const speedMatch = line.match(/speed=\s*([\d.]+)x/);
    const timeMatch = line.match(/time=\s*(-?\d+:\d{2}:\d{2}(?:\.\d+)?)/);

    if (frameMatch) {
      const val = parseInt(frameMatch[1], 10);
      if (Number.isFinite(val)) result.frame = val;
    }
    if (fpsMatch) {
      const val = parseFloat(fpsMatch[1]);
      if (Number.isFinite(val)) result.fps = val;
    }
    if (bitrateMatch) {
      const val = parseFloat(bitrateMatch[1]);
      if (Number.isFinite(val)) result.bitrateKbps = val;
    }
    if (dropMatch) {
      const val = parseInt(dropMatch[1], 10);
      if (Number.isFinite(val)) result.drop = val;
    }
    if (dupMatch) {
      const val = parseInt(dupMatch[1], 10);
      if (Number.isFinite(val)) result.dup = val;
    }
    if (speedMatch) {
      const val = parseFloat(speedMatch[1]);
      if (Number.isFinite(val)) result.speed = val;
    }
    if (timeMatch) {
      const ms = parseFfmpegTimeToMs(timeMatch[1]);
      if (ms !== undefined) result.outTimeMs = ms;
    }
  }
  return result;
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
    startedAtMs: number;
    lastProgressAt: number;
    lastFeederProgressAt: number;
    lastMasterProgressAt: number;
    feederStartTimeMs: number;
    feederFrame: number;
    feederOutTimeMs: number;
    masterFrame: number;
    masterOutTimeMs: number;
    prevDropCount: number;
    lowSpeedStreakCount: number;
    overloadLevel: number;
    lastOverloadUpgradeAt: number;
    recoveringFeeder: boolean;
    forceSoftwareFallback: boolean;
  }> = new Map();

  private clipProbeCache: Map<string, ClipProbeDetails> = new Map();
  private stopPromises: Map<string, Promise<boolean>> = new Map();
  private isFfmpegInstalled: boolean = false;
  private onStreamHaltedCallback?: (streamId: string, error: string) => void;
  private heartbeatTickCount: number = 0;

  private constructor() {
    this.checkFfmpeg();
    detectHostStreamingCapabilities();
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

  public getHostCapabilities(): HostStreamingCapabilities {
    return detectHostStreamingCapabilities();
  }

  public checkFfmpeg(): boolean {
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
      this.isFfmpegInstalled = true;
    } catch {
      this.isFfmpegInstalled = false;
      console.warn('[FFmpeg Job Manager] Notice: FFmpeg binary not found on this host system.');
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

  public async probeClipDetails(videoPath: string): Promise<ClipProbeDetails> {
    const fallback: ClipProbeDetails = {
      duration: null,
      hasAudio: false,
      videoCodec: '',
      audioCodec: '',
      pixFmt: '',
      width: 1920,
      height: 1080,
      fps: 30,
      bitrateKbps: 0,
      mtimeMs: 0,
      sizeBytes: 0
    };

    if (!fs.existsSync(videoPath)) return fallback;

    try {
      const st = fs.statSync(videoPath);
      const cached = this.clipProbeCache.get(videoPath);
      if (cached && cached.mtimeMs === st.mtimeMs && cached.sizeBytes === st.size) {
        return cached;
      }

      const { stdout } = await execFileAsync(
        'ffprobe',
        [
          '-v', 'error',
          '-probesize', '10M',
          '-analyzeduration', '10M',
          '-show_entries', 'stream=codec_type,codec_name,pix_fmt,width,height,r_frame_rate,avg_frame_rate,bit_rate,duration:format=duration,bit_rate',
          '-of', 'json',
          videoPath
        ],
        { timeout: 15000, maxBuffer: 4 * 1024 * 1024 }
      );
      const parsed = JSON.parse(stdout);
      const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
      const vStream = streams.find((s: any) => s.codec_type === 'video');
      const aStream = streams.find((s: any) => s.codec_type === 'audio');

      let fps = 30;
      const fpsExpr = vStream?.avg_frame_rate && vStream.avg_frame_rate !== '0/0' ? vStream.avg_frame_rate : vStream?.r_frame_rate;
      if (typeof fpsExpr === 'string' && fpsExpr.includes('/')) {
        const [num, den] = fpsExpr.split('/').map(Number);
        if (den > 0 && num > 0) {
          fps = Math.max(15, Math.min(60, Math.round(num / den)));
        }
      }

      const rawDur = parseFloat(parsed.format?.duration || vStream?.duration || '0');
      const rawBitrate = parseInt(vStream?.bit_rate || parsed.format?.bit_rate || '0', 10);

      const details: ClipProbeDetails = {
        duration: !isNaN(rawDur) && rawDur > 0 ? rawDur : null,
        hasAudio: Boolean(aStream),
        videoCodec: String(vStream?.codec_name || '').toLowerCase(),
        audioCodec: String(aStream?.codec_name || '').toLowerCase(),
        pixFmt: String(vStream?.pix_fmt || '').toLowerCase(),
        width: parseInt(vStream?.width, 10) || 1920,
        height: parseInt(vStream?.height, 10) || 1080,
        fps,
        bitrateKbps: Number.isFinite(rawBitrate) && rawBitrate > 0 ? Math.round(rawBitrate / 1000) : 0,
        mtimeMs: st.mtimeMs,
        sizeBytes: st.size
      };

      this.clipProbeCache.set(videoPath, details);
      return details;
    } catch {
      return fallback;
    }
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

    const nowMs = Date.now();
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
      totalTracks: config.videoPaths?.length || 0,
      droppedFrames: 0,
      dupFrames: 0,
      encodingSpeed: 0,
      stallCount: 0,
      overloadMitigations: 0,
      lastFrameCount: 0,
      lastOutTimeMs: 0
    };

    this.processes.set(config.streamId, {
      config,
      stats: initialStats,
      currentTrackIndex: startIdx,
      cumulativeTsOffset: 0,
      consecutiveFeederFailures: 0,
      recentStderr: [],
      startedAtMs: nowMs,
      lastProgressAt: nowMs,
      lastFeederProgressAt: nowMs,
      lastMasterProgressAt: nowMs,
      feederStartTimeMs: nowMs,
      feederFrame: 0,
      feederOutTimeMs: 0,
      masterFrame: 0,
      masterOutTimeMs: 0,
      prevDropCount: 0,
      lowSpeedStreakCount: 0,
      overloadLevel: 0,
      lastOverloadUpgradeAt: 0,
      recoveringFeeder: false,
      forceSoftwareFallback: false
    });

    return this.launchProcess(config);
  }

  private buildFeederArgs(
    clipPath: string,
    clipInfo: ClipProbeDetails,
    plan: ReturnType<typeof resolveAdaptiveEncodingPlan>,
    caps: HostStreamingCapabilities,
    useNativeInfiniteLoop: boolean,
    offsetSeconds: number,
    isLoopEnabled: boolean
  ): string[] {
    const args: string[] = [];
    const { profile, mode, backend, preset, tune, threads, needsScale, needsFpsFilter } = plan;

    if (backend === 'vaapi' && mode === 'hardware' && caps.hwAccel.vaapiDevice) {
      args.push('-vaapi_device', caps.hwAccel.vaapiDevice);
    }

    args.push('-re');

    if (useNativeInfiniteLoop) {
      args.push('-stream_loop', '-1');
    }

    args.push(
      '-fflags', '+genpts',
      '-thread_queue_size', '1024',
      '-probesize', '10M',
      '-analyzeduration', '10M',
      '-i', clipPath
    );

    const hasAudio = clipInfo.hasAudio;
    if (!hasAudio) {
      // Single -re clock on input 0; avoid competing -re clocks on anullsrc
      args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
    }

    // Video Stream Args
    if (mode === 'passthrough') {
      args.push(
        '-c:v', 'copy',
        '-bsf:v', 'h264_mp4toannexb'
      );
    } else if (backend === 'nvenc') {
      const vfParts: string[] = [];
      if (needsFpsFilter) vfParts.push(`fps=${profile.fps}`);
      if (needsScale) {
        vfParts.push(`scale=${profile.width}:${profile.height}:force_original_aspect_ratio=decrease:flags=fast_bilinear,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`);
      }
      vfParts.push('format=yuv420p');
      args.push(
        '-vf', vfParts.join(','),
        '-c:v', 'h264_nvenc',
        '-preset', preset,
        '-tune', 'll',
        '-zerolatency', '1',
        '-rc', 'cbr',
        '-cbr', 'true',
        '-profile:v', 'high',
        '-b:v', `${profile.bitrateKbps}k`,
        '-minrate', `${profile.bitrateKbps}k`,
        '-maxrate', `${profile.bitrateKbps}k`,
        '-bufsize', `${profile.bitrateKbps * 2}k`,
        '-g', String(profile.gop),
        '-bf', '2',
        '-vsync', 'cfr'
      );
    } else if (backend === 'qsv') {
      const vfParts: string[] = [];
      if (needsFpsFilter) vfParts.push(`fps=${profile.fps}`);
      if (needsScale) {
        vfParts.push(`scale=${profile.width}:${profile.height}:force_original_aspect_ratio=decrease:flags=fast_bilinear,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`);
      }
      vfParts.push('format=nv12');
      args.push(
        '-vf', vfParts.join(','),
        '-c:v', 'h264_qsv',
        '-preset', 'veryfast',
        '-look_ahead', '0',
        '-profile:v', 'high',
        '-b:v', `${profile.bitrateKbps}k`,
        '-minrate', `${profile.bitrateKbps}k`,
        '-maxrate', `${profile.bitrateKbps}k`,
        '-bufsize', `${profile.bitrateKbps * 2}k`,
        '-g', String(profile.gop),
        '-vsync', 'cfr'
      );
    } else if (backend === 'vaapi') {
      const vfParts: string[] = [];
      if (needsFpsFilter) vfParts.push(`fps=${profile.fps}`);
      if (needsScale) {
        vfParts.push(`scale=${profile.width}:${profile.height}:force_original_aspect_ratio=decrease:flags=fast_bilinear,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`);
      }
      vfParts.push('format=nv12,hwupload');
      args.push(
        '-vf', vfParts.join(','),
        '-c:v', 'h264_vaapi',
        '-rc_mode', 'CBR',
        '-profile:v', 'high',
        '-b:v', `${profile.bitrateKbps}k`,
        '-minrate', `${profile.bitrateKbps}k`,
        '-maxrate', `${profile.bitrateKbps}k`,
        '-bufsize', `${profile.bitrateKbps * 2}k`,
        '-g', String(profile.gop),
        '-vsync', 'cfr'
      );
    } else {
      // CPU Software libx264 with strict CBR + CFR + 2-second IDR keyframes
      const vfParts: string[] = [];
      if (needsFpsFilter) vfParts.push(`fps=${profile.fps}`);
      if (needsScale) {
        vfParts.push(`scale=${profile.width}:${profile.height}:force_original_aspect_ratio=decrease:flags=fast_bilinear,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`);
      }
      if (clipInfo.pixFmt !== 'yuv420p') {
        vfParts.push('format=yuv420p');
      }
      if (vfParts.length > 0) {
        args.push('-vf', vfParts.join(','));
      }

      args.push(
        '-c:v', 'libx264',
        '-preset', preset
      );
      if (threads > 0) {
        args.push('-threads', String(threads));
      }
      if (tune) {
        args.push('-tune', tune);
      }

      const useMainProfile = preset === 'ultrafast' || profile.width >= 1920 && profile.fps >= 50;
      args.push(
        '-profile:v', useMainProfile ? 'main' : 'high',
        '-level:v', profile.width >= 3840 ? '5.1' : '4.2'
      );
      if (!tune) {
        args.push('-bf', preset === 'ultrafast' ? '0' : '2');
      }

      args.push(
        '-b:v', `${profile.bitrateKbps}k`,
        '-minrate', `${profile.bitrateKbps}k`,
        '-maxrate', `${profile.bitrateKbps}k`,
        '-bufsize', `${profile.bitrateKbps * 2}k`,
        '-x264-params', 'nal-hrd=cbr:force-cfr=1',
        '-pix_fmt', 'yuv420p',
        '-g', String(profile.gop),
        '-keyint_min', String(profile.gop),
        '-sc_threshold', '0',
        '-force_key_frames', 'expr:gte(t,n_forced*2)',
        '-vsync', 'cfr'
      );
    }

    // Audio Stream Args: always resample/normalize to stereo 44.1 kHz AAC with async PTS sync (even when video is passthrough)
    args.push(
      '-c:a', 'aac',
      '-b:a', `${profile.audioBitrateKbps}k`,
      '-ar', '44100',
      '-ac', '2',
      '-af', 'aresample=async=1:min_hard_comp=0.100000:first_pts=0,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo'
    );

    args.push(
      '-map', '0:v:0',
      '-map', hasAudio ? '0:a:0' : '1:a:0',
      '-max_muxing_queue_size', '4096'
    );

    if (!hasAudio && (!useNativeInfiniteLoop || !isLoopEnabled)) {
      args.push('-shortest');
    }

    args.push('-avoid_negative_ts', 'make_zero');
    if (offsetSeconds > 0) {
      args.push('-output_ts_offset', offsetSeconds.toFixed(3));
    }

    args.push(
      '-mpegts_flags', '+resend_headers',
      '-f', 'mpegts',
      'pipe:1'
    );

    return args;
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

    const latestItem = this.processes.get(streamId);
    if (!latestItem || latestItem.child !== masterChild || latestItem.stats.state === 'stopped' || latestItem.stats.state === 'crashed') {
      return;
    }
    if (!masterChild.stdin || masterChild.stdin.destroyed || !masterChild.stdin.writable) {
      return;
    }

    const clipDuration = clipInfo.duration || 0;
    const requestedProfile = parseStreamEncodingProfile(
      item.config.resolution,
      item.config.bitrate,
      item.config.fps,
      item.config.videoBitrateKbps
    );

    const caps = detectHostStreamingCapabilities();
    const activeOtherStreams = Array.from(this.processes.entries())
      .filter(([id, proc]) => id !== streamId && (proc.stats.state === 'running' || proc.stats.state === 'starting'))
      .length;

    const shouldLoop = item.config.loop !== false;
    const useNativeInfiniteLoop = validPaths.length === 1 && shouldLoop;
    // Allow zero-copy passthrough on single-clip streams (or multi-clip playlists if dimensions/codecs align cleanly)
    const allowZeroCopy = validPaths.length === 1;

    const plan = resolveAdaptiveEncodingPlan(
      requestedProfile,
      clipInfo,
      caps,
      activeOtherStreams,
      allowZeroCopy,
      item.forceSoftwareFallback,
      item.overloadLevel
    );

    item.stats.encodingMode = plan.mode;
    item.stats.encoderBackend = plan.backend;
    item.stats.effectiveResolution = plan.profile.label;
    item.stats.effectiveFps = plan.profile.fps;
    item.stats.effectiveBitrateKbps = plan.profile.bitrateKbps;
    item.stats.capabilityNotice = plan.notice;

    const offsetSec = item.cumulativeTsOffset;
    const trackStartMs = Date.now();
    item.stats.currentTrackStartedAt = new Date(trackStartMs).toISOString();
    item.feederStartTimeMs = trackStartMs;
    item.lastFeederProgressAt = trackStartMs;
    item.feederFrame = 0;
    item.feederOutTimeMs = 0;
    item.prevDropCount = 0;
    item.recoveringFeeder = false;

    console.log(
      `[FFmpeg Pipeline] Stream "${item.config.title}" Track #${trackIdx + 1}/${validPaths.length}: ${path.basename(clipPath)} ` +
      `(${clipInfo.width}x${clipInfo.height}@${clipInfo.fps}fps ${clipInfo.videoCodec}) -> ` +
      `${plan.profile.width}x${plan.profile.height}@${plan.profile.fps}fps ${plan.profile.bitrateKbps}kbps ` +
      `[mode=${plan.mode}, backend=${plan.backend}, preset=${plan.preset}, overload=${item.overloadLevel}, loop=${useNativeInfiniteLoop ? 'native' : 'playlist'}, offset=${offsetSec.toFixed(3)}s]`
    );
    if (plan.notice) {
      console.warn(`[FFmpeg Capability Notice] ${plan.notice}`);
    }

    const feederArgs = this.buildFeederArgs(
      clipPath,
      clipInfo,
      plan,
      caps,
      useNativeInfiniteLoop,
      offsetSec,
      shouldLoop
    );

    let feeder: ChildProcess;
    try {
      feeder = spawn('ffmpeg', feederArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (spawnErr: any) {
      console.error('[FFmpeg Feeder] Failed to spawn clip feeder:', spawnErr.message);
      return;
    }

    item.feederChild = feeder;
    let hwStderrBuffer = '';

    feeder.stdout?.on('error', () => {});
    if (masterChild.stdin && !masterChild.stdin.destroyed) {
      feeder.stdout?.pipe(masterChild.stdin, { end: false });
    }

    feeder.stderr?.on('data', (data) => {
      if (item.feederChild !== feeder) return;
      const text = data.toString();
      const now = Date.now();
      if (hwStderrBuffer.length < 4096) hwStderrBuffer += text;

      const parsed = parseFfmpegProgressChunk(text);
      if (parsed.fps !== undefined && parsed.fps > 0) {
        item.stats.fps = parsed.fps;
      }
      if (parsed.bitrateKbps !== undefined && parsed.bitrateKbps > 0 && item.stats.bitrateKbps === 0) {
        item.stats.bitrateKbps = parsed.bitrateKbps;
      }
      if (parsed.drop !== undefined) {
        item.stats.droppedFrames = parsed.drop;
      }
      if (parsed.dup !== undefined) {
        item.stats.dupFrames = parsed.dup;
      }
      if (parsed.speed !== undefined && parsed.speed > 0) {
        item.stats.encodingSpeed = parsed.speed;
      }

      // Only advance feeder heartbeat timestamp if frame count or encoded out_time actually moved forward
      const frameAdvanced = parsed.frame !== undefined && parsed.frame > item.feederFrame;
      const timeAdvanced = parsed.outTimeMs !== undefined && parsed.outTimeMs > item.feederOutTimeMs;
      if (frameAdvanced || timeAdvanced) {
        if (parsed.frame !== undefined) item.feederFrame = parsed.frame;
        if (parsed.outTimeMs !== undefined) item.feederOutTimeMs = parsed.outTimeMs;
        item.lastFeederProgressAt = now;
        item.lastProgressAt = now;
        if (now - trackStartMs > 30000 && item.consecutiveFeederFailures > 0) {
          item.consecutiveFeederFailures = 0;
        }
      }

      if (/error|invalid|cannot|failed|too many packets|non-monotonous/i.test(text)) {
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

      // Runtime Hardware-to-CPU Automatic Fallback if a GPU session fails immediately
      if (code !== 0 && plan.mode === 'hardware' && !item.forceSoftwareFallback && elapsedSec < 12) {
        console.warn(`[FFmpeg Hardware Fallback] GPU backend (${plan.backend}) failed on track #${trackIdx + 1}; falling back to CPU libx264.`);
        item.forceSoftwareFallback = true;
        this.spawnClipFeeder(streamId, masterChild).catch(() => {});
        return;
      }

      const latestPaths = (item.config.videoPaths || []).filter(v => typeof v === 'string' && fs.existsSync(v));
      if (latestPaths.length === 0) return;

      if (code === 0) {
        item.consecutiveFeederFailures = 0;
        // Advance using exact clip container duration (fallback to elapsed only if probe had no duration)
        const advanceDur = clipDuration > 0 ? clipDuration : Math.max(elapsedSec, 1);
        item.cumulativeTsOffset += advanceDur + 0.004;
      } else {
        item.consecutiveFeederFailures += 1;
        console.warn(`[FFmpeg Feeder] Track #${trackIdx + 1} exited with code ${code}; advancing queue.`);
        item.cumulativeTsOffset += Math.max(elapsedSec, 0.5) + 0.01;
        if (item.consecutiveFeederFailures >= Math.max(latestPaths.length * 2, 3)) {
          console.error(`[FFmpeg Feeder] Too many consecutive clip failures for stream ${streamId}; halting.`);
          try { masterChild.stdin?.end(); } catch {}
          return;
        }
      }

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

    // 4. Validate local video files on disk & pre-probe all playlist clips upfront (eliminates transition stalls!)
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

    await Promise.all(validVideoPaths.map(p => this.probeClipDetails(p)));

    const initialIdx = typeof item.config.initialTrackIndex === 'number' && item.config.initialTrackIndex >= 0
      ? item.config.initialTrackIndex % validVideoPaths.length
      : 0;
    const launchNowMs = Date.now();
    item.currentTrackIndex = initialIdx;
    item.stats.currentTrackIndex = initialIdx;
    item.cumulativeTsOffset = 0;
    item.consecutiveFeederFailures = 0;
    item.startedAtMs = launchNowMs;
    item.lastProgressAt = launchNowMs;
    item.lastFeederProgressAt = launchNowMs;
    item.lastMasterProgressAt = launchNowMs;
    item.feederStartTimeMs = launchNowMs;
    item.feederFrame = 0;
    item.feederOutTimeMs = 0;
    item.masterFrame = 0;
    item.masterOutTimeMs = 0;
    item.prevDropCount = 0;
    item.lowSpeedStreakCount = 0;
    item.recoveringFeeder = false;

    const tempDir = path.join(os.tmpdir(), 'streamjoin_concat');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const concatPath = path.join(tempDir, `stream_${config.streamId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.txt`);
    this.writeConcatFile(concatPath, validVideoPaths);
    item.concatFilePath = concatPath;

    const commonMasterInputArgs = [
      '-fflags', '+genpts+discardcorrupt',
      '-thread_queue_size', '2048',
      '-analyzeduration', '2000000',
      '-probesize', '2000000',
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
      '-tcp_nodelay', '1',
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
      const childStartMs = Date.now();
      item.stats.pid = child.pid;
      item.stats.state = 'starting';
      item.stats.startedAt = nowIso;
      item.stats.currentTrackStartedAt = nowIso;
      item.stats.uptimeSeconds = 0;
      item.stats.lastError = null;
      item.startedAtMs = childStartMs;
      item.lastProgressAt = childStartMs;
      item.lastMasterProgressAt = childStartMs;
      item.lastFeederProgressAt = childStartMs;

      this.spawnClipFeeder(config.streamId, child).catch(() => {});

      child.stderr?.on('data', (data) => {
        if (item.child !== child) return;
        const text = data.toString();
        const now = Date.now();
        const lines = text.split('\n').filter(Boolean);
        item.recentStderr.push(...lines);
        if (item.recentStderr.length > 60) {
          item.recentStderr = item.recentStderr.slice(-60);
        }

        const parsed = parseFfmpegProgressChunk(text);
        if (parsed.bitrateKbps !== undefined && parsed.bitrateKbps > 0) {
          item.stats.bitrateKbps = parsed.bitrateKbps;
        }
        if (parsed.fps !== undefined && parsed.fps > 0 && item.stats.fps === 0) {
          item.stats.fps = parsed.fps;
        }
        if (parsed.speed !== undefined && parsed.speed > 0 && (!item.stats.encodingSpeed || item.stats.encodingSpeed === 0)) {
          item.stats.encodingSpeed = parsed.speed;
        }

        // Strict progress tracking: only update heartbeat when actual frame count or out_time_ms increases
        const frameAdvanced = parsed.frame !== undefined && parsed.frame > item.masterFrame;
        const timeAdvanced = parsed.outTimeMs !== undefined && parsed.outTimeMs > item.masterOutTimeMs;
        if (frameAdvanced || timeAdvanced) {
          if (parsed.frame !== undefined) {
            item.masterFrame = parsed.frame;
            item.stats.lastFrameCount = parsed.frame;
          }
          if (parsed.outTimeMs !== undefined) {
            item.masterOutTimeMs = parsed.outTimeMs;
            item.stats.lastOutTimeMs = parsed.outTimeMs;
          }
          item.lastMasterProgressAt = now;
          item.lastProgressAt = now;
        }

        if (text.includes('frame=') && !resolved) {
          resolved = true;
          if (startupTimer) clearTimeout(startupTimer);
          item.cancelStartup = undefined;
          item.stats.state = 'running';
          item.lastMasterProgressAt = now;
          item.lastProgressAt = now;
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

      // Wait up to 12s for TLS RTMPS handshake + first keyframe push confirmation (resolves early as soon as frame= arrives)
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
      }, 12000);
    });
  }

  private terminateChildWithFallback(proc: ChildProcess | undefined, graceMs: number = 500) {
    if (!proc) return;
    if (proc.exitCode !== null || proc.signalCode !== null) return;
    const pid = proc.pid;
    try {
      if (pid) process.kill(pid, 'SIGTERM');
    } catch {}
    try {
      proc.kill('SIGTERM');
    } catch {}

    const killTimer = setTimeout(() => {
      try {
        if (proc.exitCode === null && proc.signalCode === null && pid) {
          process.kill(pid, 'SIGKILL');
        }
      } catch {}
      try {
        if (proc.exitCode === null && proc.signalCode === null) {
          proc.kill('SIGKILL');
        }
      } catch {}
    }, graceMs);
    killTimer.unref?.();
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
        this.terminateChildWithFallback(oldFeeder, 200);
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
    item.stats.cpuPercent = 0;
    item.stats.memoryMb = 0;
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
    item.stats.cpuPercent = 0;
    item.stats.memoryMb = 0;

    const errorMsg = item.stats.lastError || '';

    const isPermanentConfigOrAuthFailure =
      /rejected|BadName|Unauthorized|403 Forbidden|Invalid argument|Invalid data|No such file|Protocol not found|Malformed RTMP/i.test(errorMsg) ||
      (/Connection refused|Authentication|handshake/i.test(errorMsg) && item.stats.uptimeSeconds < 5);

    const maxReconnectAttempts = 10;

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
    const baseDelay = Math.min(30000, 3000 * Math.pow(1.5, item.stats.restartAttempts - 1));
    const jitterMs = Math.round(Math.random() * 1000);
    const delayMs = Math.round(baseDelay + jitterMs);

    console.log(`[FFmpeg Auto-Reconnect] Stream ${streamId} disconnected. Attempting reconnect #${item.stats.restartAttempts}/10 in ${(delayMs / 1000).toFixed(1)}s (track #${item.currentTrackIndex + 1})...`);

    item.reconnectTimer = setTimeout(() => {
      item.reconnectTimer = undefined;
      const latestItem = this.processes.get(streamId);
      if (!latestItem || latestItem.stats.state === 'stopped') return;

      this.launchProcess(latestItem.config).catch((err) => {
        console.warn(`[FFmpeg Auto-Reconnect] Reconnect #${latestItem.stats.restartAttempts} failed:`, err.message);
        if (latestItem.stats.state === 'stopped') return;

        const fatalReject = /rejected|BadName|Unauthorized|Invalid argument|No such file|Malformed RTMP/i.test(err.message || '');
        if (!fatalReject && latestItem.stats.restartAttempts < 10) {
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
      item.stats.cpuPercent = 0;
      item.stats.memoryMb = 0;
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

      this.killFeeder(item);

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
      await Promise.all(validVideoPaths.map(p => this.probeClipDetails(p)));
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
    item.stats.droppedFrames = 0;
    item.stats.dupFrames = 0;
    item.stats.encodingSpeed = 0;
    item.stats.lastFrameCount = 0;
    item.stats.lastOutTimeMs = 0;
    item.overloadLevel = 0;
    item.lowSpeedStreakCount = 0;
    item.lastOverloadUpgradeAt = 0;
    item.forceSoftwareFallback = false;
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

  private async refreshWorkerProcessMetrics(pids: number[]): Promise<Map<number, { cpu: number; memMb: number }>> {
    const result = new Map<number, { cpu: number; memMb: number }>();
    if (pids.length === 0) return result;
    try {
      const { stdout } = await execFileAsync('ps', ['-p', pids.join(','), '-o', 'pid=,%cpu=,rss='], { timeout: 2000 });
      for (const line of stdout.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const pid = parseInt(parts[0], 10);
          const cpu = parseFloat(parts[1]) || 0;
          const rssKb = parseInt(parts[2], 10) || 0;
          if (!isNaN(pid)) {
            result.set(pid, { cpu, memMb: Math.round(rssKb / 1024) });
          }
        }
      }
    } catch {}
    return result;
  }

  private startSupervisorHeartbeat() {
    const timer = setInterval(async () => {
      this.heartbeatTickCount += 1;
      const nowMs = Date.now();
      const caps = detectHostStreamingCapabilities();
      const measureCpuNow = this.heartbeatTickCount % 2 === 1;
      const pidsToMeasure: number[] = [];

      if (measureCpuNow) {
        this.processes.forEach((item) => {
          if (item.stats.state === 'running') {
            if (item.child?.pid) pidsToMeasure.push(item.child.pid);
            if (item.feederChild?.pid) pidsToMeasure.push(item.feederChild.pid);
          }
        });
      }

      const procStats = measureCpuNow
        ? await this.refreshWorkerProcessMetrics(pidsToMeasure)
        : new Map<number, { cpu: number; memMb: number }>();

      this.processes.forEach((item, streamId) => {
        if (item.stats.state === 'running') {
          if (item.child && !item.child.killed && item.child.exitCode === null) {
            item.stats.uptimeSeconds = Math.max(0, Math.floor((nowMs - item.startedAtMs) / 1000));

            if (measureCpuNow) {
              const masterMetrics = item.child.pid ? procStats.get(item.child.pid) : undefined;
              const feederMetrics = item.feederChild?.pid ? procStats.get(item.feederChild.pid) : undefined;
              item.stats.cpuPercent = Number(((masterMetrics?.cpu || 0) + (feederMetrics?.cpu || 0)).toFixed(1));
              item.stats.memoryMb = (masterMetrics?.memMb || 0) + (feederMetrics?.memMb || 0);
            }

            // Reset transient reconnect counter after 120s of stable continuous streaming
            if (item.stats.uptimeSeconds >= 120 && item.stats.restartAttempts > 0) {
              item.stats.restartAttempts = 0;
            }

            // 1. Pre-emptive CPU / Speed Overload Guard (software mode)
            if (item.stats.state === 'running' && item.stats.encodingMode === 'software' && item.stats.uptimeSeconds >= 10) {
              const speed = item.stats.encodingSpeed || 0;
              const currentDrops = item.stats.droppedFrames || 0;
              const dropDelta = Math.max(0, currentDrops - item.prevDropCount);
              item.prevDropCount = currentDrops;

              const isSlowSpeed = speed > 0 && speed < 0.95;
              const highCpuThreshold = caps.effectiveCpuCores <= 3 ? 175 : caps.effectiveCpuCores * 88;
              const isHighCpu = item.stats.cpuPercent >= highCpuThreshold;
              const isDropSpike = dropDelta >= 15 && speed > 0 && speed < 1.0;

              if (isSlowSpeed || isHighCpu || isDropSpike) {
                item.lowSpeedStreakCount += 1;
              } else {
                item.lowSpeedStreakCount = Math.max(0, item.lowSpeedStreakCount - 1);
              }

              if (
                item.lowSpeedStreakCount >= 3 &&
                item.overloadLevel < 2 &&
                nowMs - item.lastOverloadUpgradeAt > 20000
              ) {
                item.overloadLevel += 1;
                item.lastOverloadUpgradeAt = nowMs;
                item.lowSpeedStreakCount = 0;
                item.stats.overloadMitigations = (item.stats.overloadMitigations || 0) + 1;
                console.warn(
                  `[FFmpeg Overload Guard] Stream ${streamId} overloaded (speed=${speed.toFixed(2)}x, cpu=${item.stats.cpuPercent}%, dropDelta=${dropDelta}). ` +
                  `Activating safe overload profile level ${item.overloadLevel} with clean recovery.`
                );
                item.stats.lastError = `CPU/speed overload detected (speed=${speed.toFixed(2)}x); stepping down to safer encoding profile (level ${item.overloadLevel}).`;
                this.terminateChildWithFallback(item.child, 500);
                this.killFeeder(item);
                return;
              }
            }

            // 2. Fast Master Output Stall Detection (12s without frame or out_time advance)
            const masterStallMs = nowMs - item.lastMasterProgressAt;
            if (item.stats.uptimeSeconds >= 10 && masterStallMs > 12000) {
              item.stats.stallCount = (item.stats.stallCount || 0) + 1;
              console.warn(
                `[FFmpeg Watchdog] Stream ${streamId} master stalled for ${(masterStallMs / 1000).toFixed(1)}s ` +
                `(frame=${item.masterFrame}, outTimeMs=${item.masterOutTimeMs}, fps=${item.stats.fps}, bitrate=${item.stats.bitrateKbps}kbps). ` +
                `Triggering fast recovery (SIGTERM -> SIGKILL fallback).`
              );
              item.stats.lastError = `Pipeline stalled for ${Math.round(masterStallMs / 1000)}s; automatically recovering connection.`;
              this.terminateChildWithFallback(item.child, 500);
              this.killFeeder(item);
              return;
            }

            // 3. Fast Feeder-only Stall Detection (10s without feeder frame or out_time advance)
            const feederStallMs = nowMs - item.lastFeederProgressAt;
            const feederAgeMs = nowMs - item.feederStartTimeMs;
            if (
              item.feederChild &&
              item.feederChild.exitCode === null &&
              !item.recoveringFeeder &&
              item.stats.uptimeSeconds >= 10 &&
              feederAgeMs > 8000 &&
              feederStallMs > 10000
            ) {
              item.recoveringFeeder = true;
              item.stats.stallCount = (item.stats.stallCount || 0) + 1;
              console.warn(
                `[FFmpeg Watchdog] Stream ${streamId} clip feeder stalled for ${(feederStallMs / 1000).toFixed(1)}s ` +
                `(feederFrame=${item.feederFrame}, outTimeMs=${item.feederOutTimeMs}). Recycling stalled feeder.`
              );
              this.terminateChildWithFallback(item.feederChild, 500);
            }
          } else {
            this.finalizeHaltedStream(streamId, item.stats.lastError || 'Process terminated');
          }
        }
      });
    }, 2500);
    timer.unref?.();
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
