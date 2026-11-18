import os from 'os';
import fs from 'fs';
import { StreamManager } from '../ffmpeg/StreamManager';
import { detectHostStreamingCapabilities, HostStreamingCapabilities } from '../ffmpeg/HostCapabilities';

export interface VpsResourceMetrics {
  cpuUsagePercent: number;
  cpuCores: number;
  totalMemoryMb: number;
  usedMemoryMb: number;
  freeMemoryMb: number;
  memoryUsagePercent: number;
  activeFfmpegProcesses: number;
  activeStreams: number;
  ffmpegCpuPercent: number;
  ffmpegMemoryMb: number;
  diskUsedGb: number;
  diskTotalGb: number;
  diskUsagePercent: number;
  systemUptimeSeconds: number;
  loadAverage: number[];
  osPlatform: string;
  capabilities: HostStreamingCapabilities;
  timestamp: string;
}

interface CpuTickSample {
  idle: number;
  total: number;
}

let prevCpuSample: CpuTickSample | null = null;

function readCpuTickSample(): CpuTickSample {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle;
  }
  return { idle, total };
}

function measureCpuUsagePercent(effectiveCpuCores: number): number {
  const current = readCpuTickSample();
  if (!prevCpuSample) {
    prevCpuSample = current;
    const load1 = os.loadavg()[0] || 0;
    return Number(Math.min(100, Math.max(0.5, (load1 / Math.max(1, effectiveCpuCores)) * 100)).toFixed(1));
  }

  const idleDelta = current.idle - prevCpuSample.idle;
  const totalDelta = current.total - prevCpuSample.total;
  prevCpuSample = current;

  if (totalDelta <= 0) {
    const load1 = os.loadavg()[0] || 0;
    return Number(Math.min(100, Math.max(0.5, (load1 / Math.max(1, effectiveCpuCores)) * 100)).toFixed(1));
  }

  const busyRatio = 1 - idleDelta / totalDelta;
  return Number(Math.min(100, Math.max(0.5, busyRatio * 100)).toFixed(1));
}

function readRealDiskMetrics(): { diskUsedGb: number; diskTotalGb: number; diskUsagePercent: number } {
  try {
    if (typeof fs.statfsSync === 'function') {
      const stats = fs.statfsSync(process.cwd());
      const totalBytes = Number(stats.blocks) * Number(stats.bsize);
      const freeBytes = Number(stats.bfree) * Number(stats.bsize);
      const availBytes = Number(stats.bavail) * Number(stats.bsize);
      if (totalBytes > 0) {
        const usedBytes = Math.max(0, totalBytes - freeBytes);
        const totalGb = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(1));
        const usedGb = Number((usedBytes / (1024 * 1024 * 1024)).toFixed(1));
        const pct = Math.min(100, Math.max(0, Math.round((usedBytes / (usedBytes + availBytes || totalBytes)) * 100)));
        return { diskUsedGb: usedGb, diskTotalGb: totalGb, diskUsagePercent: pct };
      }
    }
  } catch {}
  return { diskUsedGb: 0, diskTotalGb: 100, diskUsagePercent: 0 };
}

export function getVpsMetrics(): VpsResourceMetrics {
  const caps = detectHostStreamingCapabilities();
  const totalMem = caps.totalMemoryMb || Math.round(os.totalmem() / (1024 * 1024));
  const freeMem = Math.round(os.freemem() / (1024 * 1024));
  const usedMem = Math.max(0, totalMem - freeMem);
  const memoryPercent = totalMem > 0 ? Math.min(100, Math.round((usedMem / totalMem) * 100)) : 0;

  const activeProcs = StreamManager.getInstance().getAllActiveProcesses();
  const runningProcs = activeProcs.filter(p => p.state === 'running');
  const ffmpegCpuPercent = Number(
    runningProcs.reduce((acc, p) => acc + (p.cpuPercent || 0), 0).toFixed(1)
  );
  const ffmpegMemoryMb = Math.round(
    runningProcs.reduce((acc, p) => acc + (p.memoryMb || 0), 0)
  );

  const cpuUsagePercent = measureCpuUsagePercent(caps.effectiveCpuCores);
  const disk = readRealDiskMetrics();

  return {
    cpuUsagePercent,
    cpuCores: caps.cpuCores,
    totalMemoryMb: totalMem,
    usedMemoryMb: usedMem,
    freeMemoryMb: freeMem,
    memoryUsagePercent: memoryPercent,
    activeFfmpegProcesses: runningProcs.length,
    activeStreams: activeProcs.length,
    ffmpegCpuPercent,
    ffmpegMemoryMb,
    diskUsedGb: disk.diskUsedGb,
    diskTotalGb: disk.diskTotalGb,
    diskUsagePercent: disk.diskUsagePercent,
    systemUptimeSeconds: Math.round(os.uptime()),
    loadAverage: os.loadavg().map(l => Number(l.toFixed(2))),
    osPlatform: `${os.type()} ${os.release()} (${os.arch()})`,
    capabilities: caps,
    timestamp: new Date().toISOString()
  };
}
