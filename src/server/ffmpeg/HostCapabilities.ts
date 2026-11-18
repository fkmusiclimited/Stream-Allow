import os from 'os';
import fs from 'fs';
import { execSync, execFileSync } from 'child_process';

export type VideoEncoderBackend = 'nvenc' | 'qsv' | 'vaapi' | 'libx264';

export interface HardwareAcceleratorStatus {
  nvenc: boolean;
  qsv: boolean;
  vaapi: boolean;
  vaapiDevice: string | null;
  preferredBackend: VideoEncoderBackend;
}

export interface HostStreamingCapabilities {
  cpuCores: number;
  effectiveCpuCores: number;
  cpuModel: string;
  totalMemoryMb: number;
  freeMemoryMb: number;
  ffmpegInstalled: boolean;
  ffmpegVersion: string;
  hwAccel: HardwareAcceleratorStatus;
  supports4KTranscode: boolean;
  supports2KTranscode: boolean;
  supports1080p60Transcode: boolean;
  supports1080p30Transcode: boolean;
  supports4KPassthrough: boolean;
  maxTranscodeResolution: '2160p60' | '2160p30' | '1440p60' | '1440p30' | '1080p60' | '1080p30' | '720p60' | '720p30';
  maxPassthroughResolution: '2160p60';
  recommendedMaxConcurrentStreams: number;
  honestSummary: string;
  detectedAt: string;
}

let cachedCapabilities: HostStreamingCapabilities | null = null;

function readCgroupCpuLimit(fallbackCores: number): number {
  try {
    // cgroup v2: "200000 100000" -> 2.0 cores
    if (fs.existsSync('/sys/fs/cgroup/cpu.max')) {
      const raw = fs.readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim();
      const [quotaStr, periodStr] = raw.split(/\s+/);
      if (quotaStr && quotaStr !== 'max' && periodStr) {
        const quota = Number(quotaStr);
        const period = Number(periodStr);
        if (quota > 0 && period > 0) {
          return Math.max(0.5, Number((quota / period).toFixed(2)));
        }
      }
    }
    // cgroup v1
    if (fs.existsSync('/sys/fs/cgroup/cpu/cpu.cfs_quota_us') && fs.existsSync('/sys/fs/cgroup/cpu/cpu.cfs_period_us')) {
      const quota = Number(fs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_quota_us', 'utf8').trim());
      const period = Number(fs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_period_us', 'utf8').trim());
      if (quota > 0 && period > 0) {
        return Math.max(0.5, Number((quota / period).toFixed(2)));
      }
    }
  } catch {}
  return fallbackCores;
}

function readCgroupMemoryLimitMb(osTotalMb: number): number {
  try {
    if (fs.existsSync('/sys/fs/cgroup/memory.max')) {
      const raw = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
      if (raw !== 'max') {
        const bytes = Number(raw);
        if (Number.isFinite(bytes) && bytes > 0 && bytes < osTotalMb * 1024 * 1024 * 2) {
          return Math.round(bytes / (1024 * 1024));
        }
      }
    }
    if (fs.existsSync('/sys/fs/cgroup/memory/memory.limit_in_bytes')) {
      const bytes = Number(fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8').trim());
      const mb = Math.round(bytes / (1024 * 1024));
      if (Number.isFinite(mb) && mb > 128 && mb <= osTotalMb) {
        return mb;
      }
    }
  } catch {}
  return osTotalMb;
}

function findFirstVaapiDevice(): string | null {
  try {
    if (!fs.existsSync('/dev/dri')) return null;
    const entries = fs.readdirSync('/dev/dri');
    const renderNode = entries.find(e => e.startsWith('renderD'));
    return renderNode ? `/dev/dri/${renderNode}` : null;
  } catch {
    return null;
  }
}

function testEncoderSmoke(args: string[]): boolean {
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
      stdio: 'ignore',
      timeout: 5000
    });
    return true;
  } catch {
    return false;
  }
}

export function detectHostStreamingCapabilities(forceRefresh: boolean = false): HostStreamingCapabilities {
  if (cachedCapabilities && !forceRefresh) {
    return {
      ...cachedCapabilities,
      freeMemoryMb: Math.round(os.freemem() / (1024 * 1024))
    };
  }

  const cpus = os.cpus();
  const cpuCores = Math.max(1, cpus.length || 1);
  const effectiveCpuCores = readCgroupCpuLimit(cpuCores);
  const cpuModel = cpus[0]?.model || 'x64 CPU';
  const osTotalMb = Math.round(os.totalmem() / (1024 * 1024));
  const totalMemoryMb = readCgroupMemoryLimitMb(osTotalMb);
  const freeMemoryMb = Math.round(os.freemem() / (1024 * 1024));

  let ffmpegInstalled = false;
  let ffmpegVersion = 'Not installed';
  let encoderList = '';
  try {
    const verOut = execSync('ffmpeg -version', { encoding: 'utf8', timeout: 4000 });
    ffmpegInstalled = true;
    ffmpegVersion = verOut.split('\n')[0]?.trim() || 'Installed';
    encoderList = execSync('ffmpeg -hide_banner -encoders', { encoding: 'utf8', timeout: 4000 });
  } catch {
    ffmpegInstalled = false;
  }

  let hasNvidiaGpu = false;
  try {
    execSync('nvidia-smi -L', { stdio: 'ignore', timeout: 2500 });
    hasNvidiaGpu = true;
  } catch {
    hasNvidiaGpu = fs.existsSync('/dev/nvidia0');
  }

  const vaapiDevice = findFirstVaapiDevice();

  // Only perform actual FFmpeg hardware smoke tests if system exposes a GPU or DRI node (fast startup on CPU hosts)
  const nvenc = ffmpegInstalled && hasNvidiaGpu && /\bh264_nvenc\b/.test(encoderList)
    ? testEncoderSmoke(['-f', 'lavfi', '-i', 'nullsrc=s=256x256:r=30', '-frames:v', '1', '-c:v', 'h264_nvenc', '-f', 'null', '-'])
    : false;

  const qsv = ffmpegInstalled && Boolean(vaapiDevice) && /\bh264_qsv\b/.test(encoderList)
    ? testEncoderSmoke(['-f', 'lavfi', '-i', 'nullsrc=s=256x256:r=30', '-frames:v', '1', '-c:v', 'h264_qsv', '-f', 'null', '-'])
    : false;

  const vaapi = ffmpegInstalled && Boolean(vaapiDevice) && /\bh264_vaapi\b/.test(encoderList)
    ? testEncoderSmoke(['-vaapi_device', vaapiDevice!, '-f', 'lavfi', '-i', 'nullsrc=s=256x256:r=30', '-frames:v', '1', '-vf', 'format=nv12,hwupload', '-c:v', 'h264_vaapi', '-f', 'null', '-'])
    : false;

  const preferredBackend: VideoEncoderBackend = nvenc ? 'nvenc' : qsv ? 'qsv' : vaapi ? 'vaapi' : 'libx264';
  const hasAnyGpu = nvenc || qsv || vaapi;

  // Honest real-time transcoding tier calculation from verified hardware
  const supports4KTranscode = hasAnyGpu || (effectiveCpuCores >= 12 && totalMemoryMb >= 12288);
  const supports2KTranscode = hasAnyGpu || (effectiveCpuCores >= 6 && totalMemoryMb >= 6144);
  const supports1080p60Transcode = hasAnyGpu || (effectiveCpuCores >= 4 && totalMemoryMb >= 4096);
  const supports1080p30Transcode = hasAnyGpu || (effectiveCpuCores >= 2 && totalMemoryMb >= 2048);

  let maxTranscodeResolution: HostStreamingCapabilities['maxTranscodeResolution'] = '720p30';
  if (hasAnyGpu) {
    maxTranscodeResolution = '2160p60';
  } else if (effectiveCpuCores >= 16 && totalMemoryMb >= 16384) {
    maxTranscodeResolution = '2160p60';
  } else if (effectiveCpuCores >= 12 && totalMemoryMb >= 12288) {
    maxTranscodeResolution = '2160p30';
  } else if (effectiveCpuCores >= 8 && totalMemoryMb >= 8192) {
    maxTranscodeResolution = '1440p60';
  } else if (effectiveCpuCores >= 6 && totalMemoryMb >= 6144) {
    maxTranscodeResolution = '1440p30';
  } else if (effectiveCpuCores >= 2 && totalMemoryMb >= 2048) {
    // Verified on 2 vCPU / 4 GB RAM: max safe software transcode is 1080p30; 1080p60 requires >=4 vCPU or GPU
    maxTranscodeResolution = effectiveCpuCores >= 4 && totalMemoryMb >= 4096 ? '1080p60' : '1080p30';
  } else if (effectiveCpuCores >= 1.5) {
    maxTranscodeResolution = '720p60';
  }

  const recommendedMaxConcurrentStreams = hasAnyGpu
    ? Math.max(4, Math.floor(totalMemoryMb / 1024))
    : Math.max(1, Math.floor(effectiveCpuCores / 2));

  const honestSummary = hasAnyGpu
    ? `Hardware GPU (${preferredBackend.toUpperCase()}) active with ${effectiveCpuCores} vCPU & ${(totalMemoryMb / 1024).toFixed(1)} GB RAM — supports up to 4K 60fps real-time transcoding.`
    : `CPU-only host (${effectiveCpuCores} vCPU, ${(totalMemoryMb / 1024).toFixed(1)} GB RAM, no NVENC/QSV/VAAPI GPU). Max safe real-time software transcode: ${maxTranscodeResolution} (1080p60 software transcoding disabled below 4 vCPU to prevent micro-freezes). Pre-encoded H.264/AAC MP4s up to 4K60 can stream via zero-copy video passthrough (-c:v copy) when dimensions and FPS match; real-time 4K software re-encoding is NOT supported on this hardware.`;

  cachedCapabilities = {
    cpuCores,
    effectiveCpuCores,
    cpuModel,
    totalMemoryMb,
    freeMemoryMb,
    ffmpegInstalled,
    ffmpegVersion,
    hwAccel: {
      nvenc,
      qsv,
      vaapi,
      vaapiDevice,
      preferredBackend
    },
    supports4KTranscode,
    supports2KTranscode,
    supports1080p60Transcode,
    supports1080p30Transcode,
    supports4KPassthrough: ffmpegInstalled,
    maxTranscodeResolution,
    maxPassthroughResolution: '2160p60',
    recommendedMaxConcurrentStreams,
    honestSummary,
    detectedAt: new Date().toISOString()
  };

  console.log(`[Streaming Capabilities] ${cachedCapabilities.honestSummary}`);
  return { ...cachedCapabilities };
}
