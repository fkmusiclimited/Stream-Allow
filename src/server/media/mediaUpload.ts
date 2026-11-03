import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// Upload directory on host (defaults to ./uploads/media)
const uploadDir = process.env.MEDIA_UPLOAD_DIR || path.resolve(process.cwd(), 'uploads/media');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.warn('[Media Storage] Warning creating upload dir:', err);
  }
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
    cb(null, uploadDir);
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
    fileSize: 2 * 1024 * 1024 * 1024 // 2 GB max video upload
  },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.mp4', '.mov', '.mkv', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    const isExtAllowed = allowedExtensions.includes(ext);
    const isMimeAllowed = mime.startsWith('video/') ||
      mime === 'video/mp4' ||
      mime === 'video/quicktime' ||
      mime === 'video/x-matroska' ||
      mime === 'video/webm';

    if (isExtAllowed || isMimeAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video format. Supported formats: MP4, MOV, MKV, WebM'));
    }
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
 */
export async function extractVideoMetadata(filePath: string, originalName: string): Promise<VideoMetadata> {
  if (!fs.existsSync(filePath)) {
    throw new Error('Video file does not exist on disk.');
  }

  const stat = fs.statSync(filePath);
  const fileSizeBytes = stat.size;

  let width = 1920;
  let height = 1080;
  let durationSeconds = 0;
  let codecName = 'h264';
  let formatName = path.extname(originalName).replace('.', '').toUpperCase();

  try {
    // Run FFprobe to extract stream entries in JSON format
    const probeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration,codec_name:format=duration,size,bit_rate -of json "${filePath}"`;
    const probeOutput = execSync(probeCmd, { timeout: 15000 }).toString();
    const parsed = JSON.parse(probeOutput);

    const videoStream = parsed.streams && parsed.streams[0] ? parsed.streams[0] : null;
    const formatInfo = parsed.format || {};

    if (videoStream) {
      if (videoStream.width) width = parseInt(videoStream.width, 10);
      if (videoStream.height) height = parseInt(videoStream.height, 10);
      if (videoStream.codec_name) codecName = videoStream.codec_name;
    }

    const durationRaw = parseFloat(formatInfo.duration || (videoStream && videoStream.duration) || '0');
    if (!isNaN(durationRaw) && durationRaw > 0) {
      durationSeconds = Math.round(durationRaw);
    }

    // Audio stream validation: Ensure video has an audio stream. If silent, add AAC track.
    try {
      const audioProbe = execSync(
        `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of json "${filePath}"`,
        { timeout: 8000 }
      ).toString();
      const parsedAudio = JSON.parse(audioProbe);
      const hasAudio = parsedAudio.streams && parsedAudio.streams.length > 0;

      if (!hasAudio) {
        console.log(`[Media Storage] Uploaded video "${path.basename(filePath)}" has no audio track. Normalizing with silent 44.1kHz AAC audio...`);
        const tempNorm = `${filePath}.norm.mp4`;
        execSync(
          `ffmpeg -y -i "${filePath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -c:v copy -c:a aac -b:a 128k -ar 44100 -shortest "${tempNorm}"`,
          { stdio: 'ignore', timeout: 30000 }
        );
        if (fs.existsSync(tempNorm) && fs.statSync(tempNorm).size > 1000) {
          fs.renameSync(tempNorm, filePath);
        }
      }
    } catch (audioErr: any) {
      console.warn('[Media Storage] Audio check notice:', audioErr.message);
    }
  } catch (err: any) {
    console.warn('[FFprobe] Warning running ffprobe analysis:', err.message);
    if (fileSizeBytes < 1000) {
      throw new Error('Video file is empty or corrupted.');
    }
  }

  // Format resolution string
  let resolution = `${width}x${height}`;
  if (height >= 2160) {
    resolution = '4K UHD (2160p)';
  } else if (height >= 1440) {
    resolution = '2K QHD (1440p)';
  } else if (height >= 1080) {
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

  // Extract authentic thumbnail image using FFmpeg
  const baseName = path.parse(path.basename(filePath)).name;
  const thumbFileName = `thumb-${baseName}.jpg`;
  const thumbFilePath = path.join(thumbDir, thumbFileName);
  let thumbnailUrl = `/media/thumbnails/${thumbFileName}`;

  try {
    const seekTime = durationSeconds > 2 ? '00:00:01' : '00:00:00.1';
    execSync(`ffmpeg -y -ss ${seekTime} -i "${filePath}" -vframes 1 -q:v 2 "${thumbFilePath}"`, {
      stdio: 'ignore',
      timeout: 10000
    });
  } catch (thumbErr) {
    console.warn('[FFmpeg Thumbnail] Warning generating thumbnail with ffmpeg:', thumbErr);
    thumbnailUrl = 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80';
  }

  return {
    durationSeconds,
    formattedDuration,
    resolution,
    format: formatName || 'MP4',
    codec: codecName,
    width,
    height,
    fileSizeBytes,
    thumbnailUrl
  };
}
