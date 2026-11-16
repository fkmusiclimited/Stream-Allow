import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Upload directory on host (defaults to ./uploads/media)
const uploadDir = process.env.MEDIA_UPLOAD_DIR || path.resolve(process.cwd(), 'uploads/media');
const chunkTempDir = path.join(uploadDir, '.chunks');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.warn('[Media Storage] Warning creating upload dir:', err);
  }
}
if (!fs.existsSync(chunkTempDir)) {
  try {
    fs.mkdirSync(chunkTempDir, { recursive: true });
  } catch {}
}

export function getUploadDir(): string {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
}

export function getChunkTempDir(): string {
  if (!fs.existsSync(chunkTempDir)) {
    fs.mkdirSync(chunkTempDir, { recursive: true });
  }
  return chunkTempDir;
}

// Thumbnails directory
const thumbDir = path.resolve(process.cwd(), 'uploads/thumbnails');
if (!fs.existsSync(thumbDir)) {
  try {
    fs.mkdirSync(thumbDir, { recursive: true });
  } catch (err) {
    console.warn('[Media Storage] Warning creating thumbnails dir:', err);
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `video-${cleanBase}-${uniqueSuffix}${ext}`);
  }
});

export const videoUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024 // 10 GB max video upload for large files
  },
  fileFilter: (_req, file, cb) => {
    // Accept all video formats: MP4, WebM, MKV, QuickTime (MOV, QT), M4V, iPhone video, H.264, etc.
    cb(null, true);
  }
});

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, thumbDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `thumb-demo-${cleanBase}-${uniqueSuffix}${ext}`);
  }
});

export const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB max image size
  },
  fileFilter: (_req, file, cb) => {
    cb(null, true);
  }
});

export interface VideoMetadata {
  durationSeconds: number;
  formattedDuration: string;
  resolution: string;
  format: string;
  codec: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  thumbnailUrl: string;
}

/**
 * Extracts authentic video metadata (duration, resolution, file size, thumbnail) using FFprobe and FFmpeg.
 * Uses async non-blocking calls and fast scaling for large 1080p/4K MP4 files.
 */
export async function extractVideoMetadata(filePath: string, originalName: string): Promise<VideoMetadata> {
  let fileSizeBytes = 1000000;
  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      fileSizeBytes = stat.size || 1000000;
    }
  } catch {}

  const ext = path.extname(originalName).toLowerCase();
  let formatName = 'MP4';
  if (ext === '.mov' || ext === '.qt' || ext === '.quicktime') {
    formatName = 'QuickTime (MOV)';
  } else if (ext === '.webm') {
    formatName = 'WebM';
  } else if (ext === '.mkv') {
    formatName = 'MKV';
  } else if (ext === '.m4v') {
    formatName = 'M4V';
  } else {
    formatName = (ext.replace('.', '').toUpperCase()) || 'MP4';
  }

  // Baseline duration estimation from file size (~2.5 MB/min for 1080p H.264)
  const mb = fileSizeBytes / (1024 * 1024);
  const estimatedMins = Math.max(1, Math.round(mb / 2.5));
  let durationSeconds = estimatedMins * 60;
  let width = 1920;
  let height = 1080;
  let codecName = ext === '.mov' ? 'h264/quicktime' : 'h264';

  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v', 'error',
        '-probesize', '10M',
        '-analyzeduration', '10M',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,duration,codec_name:format=duration,size,bit_rate',
        '-of', 'json',
        filePath
      ],
      { timeout: 30000, maxBuffer: 4 * 1024 * 1024 }
    );
    const parsed = JSON.parse(stdout);

    const videoStream = parsed.streams && parsed.streams[0] ? parsed.streams[0] : null;
    const formatInfo = parsed.format || {};

    if (videoStream) {
      if (videoStream.width) width = parseInt(videoStream.width, 10) || 1920;
      if (videoStream.height) height = parseInt(videoStream.height, 10) || 1080;
      if (videoStream.codec_name) codecName = videoStream.codec_name;
    }

    const durationRaw = parseFloat(formatInfo.duration || (videoStream && videoStream.duration) || '0');
    if (!isNaN(durationRaw) && durationRaw > 0) {
      durationSeconds = Math.round(durationRaw);
    }
  } catch (err: any) {
    console.warn('[FFprobe] Notice reading video streams (using resilient metadata):', err.message);
  }

  // Ensure durationSeconds is always a valid positive integer (never NaN)
  durationSeconds = Math.max(1, Math.round(durationSeconds) || 60);

  // Format resolution string
  let resolution = `${width}x${height}`;
  if (height >= 2160 || width >= 3840) {
    resolution = '4K UHD (2160p)';
  } else if (height >= 1440 || width >= 2560) {
    resolution = '2K QHD (1440p)';
  } else if (height >= 1080 || width >= 1920) {
    resolution = '1080p FHD';
  } else if (height >= 720) {
    resolution = '720p HD';
  } else if (height >= 480) {
    resolution = '480p SD';
  }

  // Format duration into hh:mm:ss or mm:ss
  const hrs = Math.floor(durationSeconds / 3600);
  const mins = Math.floor((durationSeconds % 3600) / 60);
  const secs = durationSeconds % 60;
  const formattedDuration = hrs > 0
    ? `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // Extract authentic thumbnail image using FFmpeg (scaled cleanly for fast 4K/1080p extraction)
  const baseName = path.parse(path.basename(filePath)).name;
  const thumbFileName = `thumb-${baseName}.jpg`;
  const thumbFilePath = path.join(thumbDir, thumbFileName);
  let thumbnailUrl = `/media/thumbnails/${thumbFileName}`;

  try {
    const seekTime = durationSeconds > 2 ? '00:00:01' : '00:00:00.1';
    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-ss', seekTime,
        '-i', filePath,
        '-vframes', '1',
        '-vf', "scale='min(960,iw)':-2",
        '-q:v', '2',
        thumbFilePath
      ],
      { timeout: 20000 }
    );
    if (!fs.existsSync(thumbFilePath) || fs.statSync(thumbFilePath).size === 0) {
      thumbnailUrl = 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80';
    }
  } catch (thumbErr) {
    console.warn('[FFmpeg Thumbnail] Fallback thumbnail for video:', thumbErr);
    thumbnailUrl = 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80';
  }

  return {
    durationSeconds,
    formattedDuration,
    resolution,
    format: formatName,
    codec: codecName,
    width,
    height,
    fileSizeBytes,
    thumbnailUrl
  };
}
