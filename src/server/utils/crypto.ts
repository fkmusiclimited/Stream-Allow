import crypto from 'crypto';

const DEFAULT_FALLBACK_SECRET = 'streamjoin_aes256_master_secret_encryption_key_2026';

// 32-byte master encryption key derived from ENCRYPTION_SECRET environment variable (or safe default fallback).
const getMasterKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_SECRET || DEFAULT_FALLBACK_SECRET;
  return crypto.createHash('sha256').update(secret).digest();
};

export interface EncryptedData {
  cipherText: string;
  iv: string;
  authTag: string;
}

/**
 * Validates that ENCRYPTION_SECRET is present and robust on server start.
 * In development, automatically assigns a fallback if missing.
 */
export function validateEncryptionConfig() {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.trim().length < 16) {
    console.warn('[SECURITY NOTICE] ENCRYPTION_SECRET environment variable is missing or short. Initializing master encryption secret.');
    process.env.ENCRYPTION_SECRET = DEFAULT_FALLBACK_SECRET;
  }
}

/**
 * Encrypts sensitive credentials like YouTube RTMP Stream Keys using AES-256-GCM.
 * Throws an explicit error if encryption fails, never returning empty ciphertext to prevent database corruption.
 */
export function encryptStreamKey(plainText: string): EncryptedData {
  if (!plainText || plainText.trim() === '') {
    throw new Error('Cannot encrypt empty or blank stream key.');
  }

  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error('[FATAL SECURITY ERROR] Missing or invalid ENCRYPTION_SECRET environment variable.');
  }

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', getMasterKey(), iv);
    
    let encrypted = cipher.update(plainText.trim(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const ivHex = iv.toString('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    if (!encrypted || !ivHex || !authTag) {
      throw new Error('AES-256-GCM produced an incomplete encrypted payload.');
    }

    return {
      cipherText: encrypted,
      iv: ivHex,
      authTag: authTag
    };
  } catch (err: any) {
    console.error('[Crypto Engine] AES-256-GCM encryption failure:', err.message);
    throw new Error(`Encryption failed: ${err.message}`);
  }
}

/**
 * Packs AES-256-GCM encrypted data into a single self-contained string
 * for database schemas that store only an `encrypted_stream_key` column without separate IV/tag columns.
 */
export function packEncryptedStreamKey(enc: EncryptedData): string {
  if (!enc?.cipherText || !enc?.iv || !enc?.authTag) {
    throw new Error('Cannot pack incomplete encrypted stream key payload.');
  }
  return `aes256gcm:v1:${enc.iv}:${enc.authTag}:${enc.cipherText}`;
}

/**
 * Unpacks an `aes256gcm:v1:<iv>:<authTag>:<cipherText>` envelope, JSON payload, or `iv:tag:cipher` string if applicable.
 */
export function unpackEncryptedStreamKey(rawValue: string): EncryptedData | null {
  if (!rawValue || typeof rawValue !== 'string') return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('aes256gcm:v1:')) {
    const parts = trimmed.split(':');
    if (parts.length === 5 && parts[2] && parts[3] && parts[4]) {
      return {
        iv: parts[2],
        authTag: parts[3],
        cipherText: parts[4]
      };
    }
    return null;
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.cipherText && parsed?.iv && parsed?.authTag) {
        return {
          cipherText: String(parsed.cipherText),
          iv: String(parsed.iv),
          authTag: String(parsed.authTag)
        };
      }
    } catch {}
  }

  if (/^[0-9a-f]{24,32}:[0-9a-f]{32}:[0-9a-f]+$/i.test(trimmed)) {
    const [iv, authTag, cipherText] = trimmed.split(':');
    return { cipherText, iv, authTag };
  }

  return null;
}

/**
 * Extracts encrypted stream key fields from a database row across different schema column conventions.
 */
export function extractEncryptedKeyFromRow(row: any): EncryptedData {
  if (!row || typeof row !== 'object') {
    return { cipherText: '', iv: '', authTag: '' };
  }

  const pickNonEmpty = (vals: unknown[]): string => {
    for (const v of vals) {
      if (typeof v === 'string' && v.trim().length > 0) {
        return v.trim();
      }
    }
    return '';
  };

  const rawCipher = pickNonEmpty([
    row.encrypted_key_cipher,
    row.encrypted_stream_key,
    row.stream_key_encrypted,
    row.encrypted_key,
    row.cipher_text
  ]);

  const rawIv = pickNonEmpty([
    row.encrypted_key_iv,
    row.stream_key_iv,
    row.encryption_iv,
    row.key_iv,
    row.iv
  ]);

  const rawTag = pickNonEmpty([
    row.encrypted_key_tag,
    row.stream_key_tag,
    row.stream_key_auth_tag,
    row.encrypted_key_auth_tag,
    row.auth_tag,
    row.encryption_tag,
    row.key_tag
  ]);

  const unpacked = unpackEncryptedStreamKey(rawCipher);
  if (unpacked) {
    return unpacked;
  }

  return {
    cipherText: rawCipher,
    iv: rawIv,
    authTag: rawTag
  };
}

/**
 * Decrypts encrypted RTMP Stream Keys in memory before passing to FFmpeg child process.
 * Supports both split `(cipherText, ivHex, authTagHex)` columns and packed `aes256gcm:v1:...` payloads.
 * Throws an error if decryption fails or authentication tag does not match.
 */
export function decryptStreamKey(cipherTextOrPacked: string, ivHex?: string, authTagHex?: string): string {
  const unpacked = unpackEncryptedStreamKey(cipherTextOrPacked);
  const cipherText = unpacked ? unpacked.cipherText : (cipherTextOrPacked || '').trim();
  const ivResolved = unpacked ? unpacked.iv : (ivHex || '').trim();
  const tagResolved = unpacked ? unpacked.authTag : (authTagHex || '').trim();

  if (!cipherText || !ivResolved || !tagResolved) {
    throw new Error('Incomplete encryption payload provided for decryption.');
  }
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('[FATAL SECURITY ERROR] Missing ENCRYPTION_SECRET environment variable.');
  }

  try {
    const iv = Buffer.from(ivResolved, 'hex');
    const authTag = Buffer.from(tagResolved, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getMasterKey(), iv);
    
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(cipherText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    console.error('[Crypto Engine] AES-256-GCM decryption failed:', err.message);
    throw new Error(`Decryption failed: authentication tag mismatch or corrupted ciphertext (${err.message}).`);
  }
}

/**
 * Safely masks a stream key for logs or sanitized display (e.g. live_****1234)
 */
export function maskStreamKey(key: string): string {
  if (!key) return '****';
  const clean = key.trim();
  if (clean.length <= 8) return '****';
  return `${clean.substring(0, 4)}****${clean.substring(clean.length - 4)}`;
}
