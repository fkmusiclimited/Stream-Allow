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
 * Checks if the encryption subsystem has a configured secret.
 */
export function isEncryptionConfigured(): boolean {
  return Boolean(process.env.ENCRYPTION_SECRET);
}

/**
 * Encrypts sensitive credentials like YouTube RTMP Stream Keys using AES-256-GCM.
 * Halts safely if ENCRYPTION_SECRET is missing.
 */
export function encryptStreamKey(plainText: string): EncryptedData {
  if (!plainText) {
    return { cipherText: '', iv: '', authTag: '' };
  }
  if (!process.env.ENCRYPTION_SECRET) {
    console.warn('[SECURITY NOTICE] Cannot encrypt stream key: ENCRYPTION_SECRET environment variable is missing.');
    return { cipherText: '', iv: '', authTag: '' };
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getMasterKey(), iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    cipherText: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag
  };
}

/**
 * Decrypts encrypted RTMP Stream Keys in memory before passing to FFmpeg child process.
 * Halts safely if ENCRYPTION_SECRET is missing.
 */
export function decryptStreamKey(cipherText: string, ivHex: string, authTagHex: string): string {
  if (!cipherText || !ivHex || !authTagHex) {
    return '';
  }
  if (!process.env.ENCRYPTION_SECRET) {
    console.warn('[SECURITY NOTICE] Cannot decrypt stream key: ENCRYPTION_SECRET environment variable is missing.');
    return '';
  }
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getMasterKey(), iv);
    
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(cipherText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt stream key:', err);
    return '';
  }
}
