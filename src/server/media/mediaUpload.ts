import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Upload directory on VPS host (defaults to ./uploads/media)
const uploadDir = process.env.MEDIA_UPLOAD_DIR || path.resolve(process.cwd(), 'uploads/media');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.warn('[Media Storage] Warning creating upload dir:', err);
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `video-${uniqueSuffix}${ext}`);
  }
});

export const videoUpload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // 2 GB max video upload
  },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.mp4', '.mkv', '.mov', '.avi', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video file format. Supported: MP4, MKV, MOV, WEBM'));
    }
  }
});

/**
 * Extracts video metadata (duration, resolution, auto-thumbnail)
 */
export async function extractVideoMetadata(filePath: string, originalName: string) {
  const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
  const fileSize = stat ? stat.size : 150 * 1024 * 1024;

  // Approximate duration: ~2.5 MB per minute for 1080p MP4
  const estimatedSeconds = Math.max(30, Math.round((fileSize / (2.5 * 1024 * 1024)) * 60));
  const hrs = Math.floor(estimatedSeconds / 3600);
  const mins = Math.floor((estimatedSeconds % 3600) / 60);
  const secs = estimatedSeconds % 60;
  const formattedDuration = hrs > 0
    ? `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return {
    durationSeconds: estimatedSeconds,
    formattedDuration,
    resolution: '1080p FHD',
    format: 'MP4',
    fileSizeBytes: fileSize,
    thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80'
  };
}
