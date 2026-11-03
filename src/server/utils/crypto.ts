import crypto from 'crypto';

// 32-byte master encryption key derived strictly from ENCRYPTION_SECRET environment variable.
// No hardcoded fallback.
const getMasterKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    console.error('[FATAL SECURITY ERROR] Missing ENCRYPTION_SECRET environment variable.');
    throw new Error('ENCRYPTION_SECRET is required to operate the encryption subsystem safely.');
  }
  return crypto.createHash('sha256').update(secret).digest();
};

export interface EncryptedData {
  cipherText: string;
  iv: string;
  authTag: string;
}

/**
 * Validates that ENCRYPTION_SECRET is present and robust on server start.
 * Aborts startup immediately if missing to avoid unencrypted or failed operations.
 */
export function validateEncryptionConfig() {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.trim().length < 16) {
    console.error('[FATAL SECURITY ERROR] ENCRYPTION_SECRET environment variable is missing or too weak (min 16 characters required).');
    console.error('Server cannot start securely without a configured ENCRYPTION_SECRET. Aborting startup.');
    process.exit(1);
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
  if (!secret) {
    throw new Error('[FATAL SECURITY ERROR] Missing ENCRYPTION_SECRET environment variable.');
  }

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', getMasterKey(), iv);
    
    let encrypted = cipher.update(plainText.trim(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      cipherText: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag
    };
  } catch (err: any) {
    console.error('[Crypto Engine] AES-256-GCM encryption failure:', err.message);
    throw new Error(`Encryption failed: ${err.message}`);
  }
}

/**
 * Decrypts encrypted RTMP Stream Keys in memory before passing to FFmpeg child process.
 * Throws an error if decryption fails or authentication tag does not match.
 */
export function decryptStreamKey(cipherText: string, ivHex: string, authTagHex: string): string {
  if (!cipherText || !ivHex || !authTagHex) {
    throw new Error('Incomplete encryption payload provided for decryption.');
  }
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('[FATAL SECURITY ERROR] Missing ENCRYPTION_SECRET environment variable.');
  }

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
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
