import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const DEFAULT_FALLBACK_JWT_SECRET = 'streamjoin_jwt_secure_master_secret_key_2026_fallback';

// In-memory revocation stores (prevents logged-out or pre-reset tokens from being reused)
const revokedTokens = new Set<string>();
const userInvalidatedBeforeMs = new Map<string, number>();
const userSessionVersion = new Map<string, number>();

export function validateJwtConfig() {
  if (!process.env.JWT_SECRET) {
    console.warn('[SECURITY NOTICE] JWT_SECRET environment variable is missing. Initializing session secret.');
    process.env.JWT_SECRET = DEFAULT_FALLBACK_JWT_SECRET;
  }
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'manager' | 'support' | 'user';
  plan?: string;
  sv?: number;
  issuedMs?: number;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Hashes plaintext password using bcrypt with 10 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Strictly compares plaintext password against stored bcrypt hash.
 * Zero hardcoded or demo password fallbacks.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash || typeof hash !== 'string' || !hash.startsWith('$2')) {
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Hashes one-time password reset tokens using SHA-256 before database storage.
 */
export function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(String(rawToken || '').trim()).digest('hex');
}

/**
 * Revokes an active JWT string immediately (e.g. on Logout).
 */
export function revokeToken(token: string) {
  if (!token) return;
  revokedTokens.add(token);
  if (revokedTokens.size > 10000) {
    const oldest = revokedTokens.values().next().value;
    if (oldest) revokedTokens.delete(oldest);
  }
}

function getCurrentSessionVersion(userId?: string, email?: string): number {
  const idVer = userId ? (userSessionVersion.get(`id:${String(userId)}`) || 0) : 0;
  const emailVer = email ? (userSessionVersion.get(`email:${String(email).trim().toLowerCase()}`) || 0) : 0;
  return Math.max(idVer, emailVer);
}

/**
 * Invalidates all tokens issued before now for a given user (e.g. after Password Reset / Change).
 */
export function invalidateUserSessions(userId?: string, email?: string) {
  const now = Date.now();
  const nextVer = getCurrentSessionVersion(userId, email) + 1;
  if (userId) {
    userInvalidatedBeforeMs.set(`id:${String(userId)}`, now);
    userSessionVersion.set(`id:${String(userId)}`, nextVer);
  }
  if (email) {
    const key = `email:${String(email).trim().toLowerCase()}`;
    userInvalidatedBeforeMs.set(key, now);
    userSessionVersion.set(key, nextVer);
  }
}

/**
 * Signs a secure JWT token with 12-hour expiration.
 */
export function signToken(user: AuthUser): string {
  const secret = process.env.JWT_SECRET || DEFAULT_FALLBACK_JWT_SECRET;
  const sv = getCurrentSessionVersion(user.id, user.email);
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      sv,
      issuedMs: Date.now()
    },
    secret,
    { expiresIn: '12h' }
  );
}

/**
 * Strict JWT authentication middleware.
 * Rejects any missing, unverified, expired, logged-out, or pre-password-reset token with HTTP 401.
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.'
    });
  }

  if (revokedTokens.has(token)) {
    return res.status(401).json({
      success: false,
      message: 'Session has been logged out. Please log in again.'
    });
  }

  const secret = process.env.JWT_SECRET || DEFAULT_FALLBACK_JWT_SECRET;

  try {
    const decoded = jwt.verify(token, secret) as AuthUser;
    if (!decoded || (!decoded.id && !decoded.email)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.'
      });
    }

    const currentSv = getCurrentSessionVersion(decoded.id, decoded.email);
    const tokenSv = typeof decoded.sv === 'number' ? decoded.sv : 0;
    const issuedAtMs = typeof decoded.issuedMs === 'number'
      ? decoded.issuedMs
      : (typeof decoded.iat === 'number' ? decoded.iat * 1000 : 0);
    const idCutoff = decoded.id ? userInvalidatedBeforeMs.get(`id:${decoded.id}`) : undefined;
    const emailCutoff = decoded.email ? userInvalidatedBeforeMs.get(`email:${decoded.email.toLowerCase()}`) : undefined;
    const cutoff = Math.max(idCutoff || 0, emailCutoff || 0);

    // Reject tokens minted before the most recent password change/reset
    if (tokenSv < currentSv || (cutoff > 0 && issuedAtMs < cutoff)) {
      return res.status(401).json({
        success: false,
        message: 'Session expired after password update. Please log in again.'
      });
    }

    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.'
    });
  }
}

/**
 * Requires specified roles (e.g. ['super_admin', 'admin'])
 */
export function requireRoles(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: insufficient permissions for this action.'
      });
    }
    next();
  };
}
