import { spawn, ChildProcess, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
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
  videoPaths?: string[]; // Array of video file paths on server
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
}

export class StreamManager {
  private static instance: StreamManager;
  private processes: Map<string, {
    child?: ChildProcess;
    config: StreamConfig;
    stats: StreamProcessStats;
    concatFilePath?: string;
    intervalTimer?: NodeJS.Timeout;
    reconnectTimer?: NodeJS.Timeout;
    recentStderr: string[];
  }> = new Map();

  private isFfmpegInstalled: boolean = false;

  private constructor() {
    this.checkFfmpeg();
    this.startSupervisorHeartbeat();
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

  /**
   * Starts an isolated real FFmpeg live stream process for a user.
   */
  public async startStream(config: StreamConfig): Promise<StreamProcessStats> {
    // If stream is already running with an active child process, return its status
    if (this.processes.has(config.streamId)) {
      const existing = this.processes.get(config.streamId)!;
      if (existing.stats.state === 'running' && existing.child && !existing.child.killed && existing.stats.pid) {
        return existing.stats;
      }
      // If previous process died or stopped, clean it up before launching new process
      if (existing.child && !existing.child.killed) {
        try {
          existing.child.kill('SIGTERM');
        } catch {}
      }
    }

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
      startedAt: new Date().toISOString()
    };

    this.processes.set(config.streamId, {
      config,
      stats: initialStats,
      recentStderr: []
    });

    return this.launchProcess(config);
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

    // Precise Target URL: RTMP_URL + "/" + Stream_Key
    const primaryTarget = `${baseRtmpUrl}/${cleanStreamKey}`;

    // 4. Validate local video files on disk
    const validVideoPaths = (config.videoPaths || []).filter(v => typeof v === 'string' && fs.existsSync(v));
    if (validVideoPaths.length === 0) {
      const errorMsg = 'No valid video files found on disk for this stream playlist. Please upload MP4 video files.';
      item.stats.state = 'crashed';
      item.stats.pid = null;
      item.stats.lastError = errorMsg;
      throw new Error(errorMsg);
    }

    // Prepare media sources concat file
    const tempDir = path.join(os.tmpdir(), 'streamjoin_concat');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const concatPath = path.join(tempDir, `stream_${config.streamId}.txt`);
    const concatContent = ['ffconcat version 1.0', ...validVideoPaths.map(v => `file '${v.replace(/'/g, "'\\''")}'`)].join('\n');
    fs.writeFileSync(concatPath, concatContent, 'utf8');
    item.concatFilePath = concatPath;

    let ffmpegArgs: string[];
    const videoBitrate = config.videoBitrateKbps || 4500;

    if (config.isDualStream && config.backupRtmpUrl) {
      // Dual RTMP Streaming via tee muxer
      const teeOutput = `[f=flv:onfail=ignore]${primaryTarget}|[f=flv:onfail=ignore]${config.backupRtmpUrl}`;
      ffmpegArgs = [
        '-re',
        '-stream_loop', '-1',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatPath,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-b:v', `${videoBitrate}k`,
        '-maxrate', `${videoBitrate}k`,
        '-bufsize', `${videoBitrate * 2}k`,
        '-pix_fmt', 'yuv420p',
        '-g', '60',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-f', 'tee',
        '-map', '0:v',
        '-map', '0:a',
        teeOutput
      ];
    } else {
      // Standard Single RTMP Target to YouTube
      ffmpegArgs = [
        '-re',
        '-stream_loop', '-1',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatPath,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-b:v', `${videoBitrate}k`,
        '-maxrate', `${videoBitrate}k`,
        '-bufsize', `${videoBitrate * 2}k`,
        '-pix_fmt', 'yuv420p',
        '-g', '60',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-f', 'flv',
        primaryTarget
      ];
    }

    console.log(`[FFmpeg] Spawning real stream worker for Stream: ${config.streamId} ("${config.title}")`);

    return new Promise<StreamProcessStats>((resolve, reject) => {
      let resolved = false;

      let child: ChildProcess;
      try {
        child = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (err: any) {
        item.stats.state = 'crashed';
        item.stats.pid = null;
        item.stats.lastError = `Failed to spawn FFmpeg: ${err.message}`;
        return reject(new Error(item.stats.lastError));
      }

      item.child = child;
      item.recentStderr = [];

      if (!child.pid) {
        item.stats.state = 'crashed';
        item.stats.pid = null;
        item.stats.lastError = 'Failed to acquire Process ID from FFmpeg process.';
        return reject(new Error(item.stats.lastError));
      }

      // Real OS Process ID
      item.stats.pid = child.pid;
      item.stats.startedAt = new Date().toISOString();
      item.stats.uptimeSeconds = 0;
      item.stats.lastError = null;

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        const lines = text.split('\n').filter(Boolean);
        item.recentStderr.push(...lines);
        if (item.recentStderr.length > 50) {
          item.recentStderr = item.recentStderr.slice(-50);
        }

        // Parse real FPS and bitrate directly from FFmpeg progress output
        const fpsMatch = text.match(/fps=\s*([\d.]+)/);
        const bitrateMatch = text.match(/bitrate=\s*([\d.]+)kbits\/s/);
        if (fpsMatch) item.stats.fps = parseFloat(fpsMatch[1]);
        if (bitrateMatch) item.stats.bitrateKbps = parseFloat(bitrateMatch[1]);
      });

      child.on('error', (err) => {
        console.error(`[FFmpeg] Stream ${config.streamId} process error:`, err);
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
        console.warn(`[FFmpeg] Stream ${config.streamId} process closed with exit code ${code}`);
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
            resolve(item.stats);
          } else {
            item.stats.state = 'crashed';
            item.stats.pid = null;
            const errorMsg = item.stats.lastError || `FFmpeg process exited immediately with code ${child.exitCode}`;
            reject(new Error(errorMsg));
          }
        }
      }, 1000);
    });
  }

  private extractRecentError(stderrLines: string[], exitCode: number | null): string {
    if (!stderrLines || stderrLines.length === 0) {
      return `FFmpeg process terminated unexpectedly (exit code: ${exitCode}).`;
    }
    // Search backward for real error message
    for (let i = stderrLines.length - 1; i >= 0; i--) {
      const line = stderrLines[i].trim();
      if (line.match(/(error|fatal|cannot|invalid|failed|refused|unknown|no such file)/i)) {
        return this.maskSensitiveOutput(line);
      }
    }
    const filtered = stderrLines.filter(l => !l.includes('frame=') && !l.includes('fps='));
    const lastLine = filtered[filtered.length - 1] || stderrLines[stderrLines.length - 1];
    return this.maskSensitiveOutput(`FFmpeg error (code ${exitCode}): ${lastLine}`);
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

    if (item.stats.state === 'stopped') {
      return; // Normal intentional user stop
    }

    item.stats.pid = null;
    item.stats.fps = 0;
    item.stats.bitrateKbps = 0;

    item.stats.restartAttempts += 1;

    if (item.stats.restartAttempts <= 3 && exitCode !== 0) {
      item.stats.state = 'reconnecting';
      const delayMs = 3000 * item.stats.restartAttempts;
      console.log(`[FFmpeg Auto-Reconnect] Stream ${streamId} disconnected. Attempting reconnect #${item.stats.restartAttempts} in ${delayMs / 1000}s...`);

      item.reconnectTimer = setTimeout(() => {
        this.launchProcess(item.config).catch(err => {
          console.warn(`[FFmpeg Auto-Reconnect] Reconnect #${item.stats.restartAttempts} failed:`, err.message);
        });
      }, delayMs);
    } else {
      item.stats.state = 'crashed';
      if (!item.stats.lastError) {
        item.stats.lastError = `FFmpeg stream halted after ${item.stats.restartAttempts} attempts (exit code ${exitCode}).`;
      }
      console.log(`[FFmpeg Supervisor] Stream ${streamId} halted. Error: ${item.stats.lastError}`);
    }
  }

  public async stopStream(streamId: string): Promise<boolean> {
    const item = this.processes.get(streamId);
    if (!item) return false;

    item.stats.state = 'stopped';
    item.stats.pid = null;
    item.stats.fps = 0;
    item.stats.bitrateKbps = 0;
    item.stats.uptimeSeconds = 0;

    if (item.reconnectTimer) clearTimeout(item.reconnectTimer);
    if (item.child && !item.child.killed) {
      try {
        item.child.kill('SIGTERM');
      } catch (e) {
        try {
          item.child.kill('SIGKILL');
        } catch {}
      }
    }

    if (item.concatFilePath && fs.existsSync(item.concatFilePath)) {
      try {
        fs.unlinkSync(item.concatFilePath);
      } catch {}
    }

    return true;
  }

  public async restartStream(streamId: string): Promise<StreamProcessStats> {
    const item = this.processes.get(streamId);
    if (!item) throw new Error(`Stream ${streamId} is not registered`);

    await this.stopStream(streamId);
    item.stats.restartAttempts = 0;
    item.stats.state = 'starting';
    item.stats.lastError = null;
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
      this.processes.forEach((item) => {
        if (item.stats.state === 'running') {
          if (item.child && !item.child.killed && item.child.exitCode === null) {
            item.stats.uptimeSeconds += 5;
          } else {
            item.stats.state = 'crashed';
            item.stats.pid = null;
            item.stats.fps = 0;
            item.stats.bitrateKbps = 0;
          }
        }
      });
    }, 5000);
  }

  public async recoverActiveStreams(streamsToRecover: StreamConfig[]) {
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
      }
    }
  }
}
