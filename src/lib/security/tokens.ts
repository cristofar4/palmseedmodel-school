import 'server-only';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

function secret(): string {
  return process.env.SESSION_SECRET ?? 'development-only-secret-value-change-me-now';
}

/** A URL safe opaque token. Used for sessions and verification links. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Stored form of a bearer style token. Plain SHA-256 is correct here: the
 * input already has full entropy, so there is nothing for a slow hash to add.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Keyed hash, used where the input space is small enough to enumerate. */
export function keyedHash(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('hex');
}

/**
 * A six digit numeric reset code. randomInt is rejection sampled, so every
 * value from 000000 to 999999 is equally likely.
 */
export function sixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * Reset codes only carry about 20 bits, so they are stored as a keyed hash.
 * The key lives in SESSION_SECRET, which means a stolen database dump alone
 * cannot be brute forced back to the code.
 */
export function hashResetCode(code: string, userId: string): string {
  return createHmac('sha256', secret()).update(`${userId}:${code}`).digest('hex');
}

/** Constant time string comparison for equal length hex or base64 digests. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Stores only a keyed digest of the client address. The dashboard can still
 * group activity by origin and spot repeated failures, but the raw address is
 * never written down.
 */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return keyedHash(`ip:${ip}`).slice(0, 32);
}
