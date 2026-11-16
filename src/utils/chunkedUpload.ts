export interface UploadedMediaResult {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  url: string;
  fileUrl: string;
  durationSeconds: number;
  formattedDuration: string;
  resolution: string;
  format: string;
  codec: string;
  fileSizeBytes: number;
  thumbnailUrl: string;
}

const CHUNK_THRESHOLD_BYTES = 8 * 1024 * 1024; // Files > 8 MB use chunked upload to bypass 32 MiB proxy limits
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks

let memoryAuthToken: string | null = null;

export function setUploadAuthToken(token: string | null): void {
  memoryAuthToken = token && token.trim() ? token.trim() : null;
}

export function getUploadAuthToken(): string | null {
  return memoryAuthToken;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (memoryAuthToken) {
    headers['Authorization'] = `Bearer ${memoryAuthToken}`;
  }
  return headers;
}

function uploadSingleXhr(
  file: File,
  onProgress: (percent: number) => void
): Promise<UploadedMediaResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('video', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media/upload');
    const authHeaders = getAuthHeaders();
    for (const [k, v] of Object.entries(authHeaders)) {
      xhr.setRequestHeader(k, v);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}

      if (xhr.status >= 200 && xhr.status < 300 && (data?.file || data?.media)) {
        onProgress(100);
        resolve(data.file || data.media);
      } else {
        reject(new Error(data?.message || data?.error || `Upload failed (HTTP ${xhr.status}).`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading video file.'));
    };

    xhr.send(formData);
  });
}

function sendChunkXhr(
  url: string,
  formData: FormData,
  headers: Record<string, string>,
  onChunkProgress: (loadedBytes: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.timeout = 120000; // 2 min per 5 MB chunk
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onChunkProgress(event.loaded);
      }
    };

    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}

      if (xhr.status >= 200 && xhr.status < 300 && data?.success) {
        resolve(data);
      } else {
        const err: any = new Error(data?.message || data?.error || `Chunk upload failed (HTTP ${xhr.status}).`);
        err.status = xhr.status;
        reject(err);
      }
    };

    xhr.onerror = () => {
      const err: any = new Error('Network error during chunk upload.');
      err.status = 0;
      reject(err);
    };

    xhr.ontimeout = () => {
      const err: any = new Error('Chunk upload timed out.');
      err.status = 408;
      reject(err);
    };

    xhr.send(formData);
  });
}

export async function uploadVideoFileWithChunking(
  file: File,
  onProgress: (percent: number) => void
): Promise<UploadedMediaResult> {
  if (file.size <= CHUNK_THRESHOLD_BYTES) {
    return uploadSingleXhr(file, onProgress);
  }

  const authHeaders = getAuthHeaders();

  // 1. Initialize chunked upload session & validate storage quota
  const initRes = await fetch('/api/media/upload/init', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'video/mp4'
    })
  });

  const initData = await initRes.json().catch(() => null);
  if (!initRes.ok || !initData?.success || !initData?.uploadId) {
    throw new Error(initData?.message || initData?.error || `Failed to initialize video upload (HTTP ${initRes.status}).`);
  }

  const uploadId: string = initData.uploadId;
  const chunkSize: number = Number(initData.chunkSize) || DEFAULT_CHUNK_SIZE;
  const totalChunks = Math.ceil(file.size / chunkSize);

  try {
    // 2. Upload chunks sequentially with automatic retry for transient errors / 429
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const blob = file.slice(start, end);

      let uploadedChunk = false;
      let lastChunkErr: any = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const fd = new FormData();
        fd.append('uploadId', uploadId);
        fd.append('chunkIndex', String(chunkIndex));
        fd.append('offset', String(start));
        fd.append('chunk', blob, `chunk_${chunkIndex}.part`);

        try {
          await sendChunkXhr('/api/media/upload/chunk', fd, authHeaders, (loadedInChunk) => {
            const totalLoaded = Math.min(file.size, start + loadedInChunk);
            const pct = Math.min(96, Math.round((totalLoaded / file.size) * 96));
            onProgress(pct);
          });
          uploadedChunk = true;
          break;
        } catch (err: any) {
          lastChunkErr = err;
          const retryable = err?.status === 0 || err?.status === 408 || err?.status === 429 || err?.status >= 500;
          if (!retryable || attempt === 2) break;
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
        }
      }

      if (!uploadedChunk) {
        throw lastChunkErr || new Error(`Failed uploading part ${chunkIndex + 1}/${totalChunks}.`);
      }

      const donePct = Math.min(96, Math.round((end / file.size) * 96));
      onProgress(donePct);
    }

    // 3. Complete upload & trigger FFprobe metadata analysis on server
    onProgress(98);
    const completeRes = await fetch('/api/media/upload/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({ uploadId })
    });

    const completeData = await completeRes.json().catch(() => null);
    if (!completeRes.ok || !completeData?.success || !(completeData?.file || completeData?.media)) {
      throw new Error(completeData?.message || completeData?.error || `Failed finalizing upload (HTTP ${completeRes.status}).`);
    }

    onProgress(100);
    return completeData.file || completeData.media;
  } catch (err) {
    // Best-effort cleanup of incomplete server chunks
    fetch('/api/media/upload/abort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ uploadId })
    }).catch(() => {});
    throw err;
  }
}
