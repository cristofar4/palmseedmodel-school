import 'server-only';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

interface ScryptOptions {
  N: number;
  r: number;
  p: number;
  maxmem: number;
}

// promisify picks the overload without an options argument, so the promisified
// form is retyped here to keep the cost parameters.
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/**
 * scrypt parameters. N is the CPU and memory cost, r the block size and p the
 * parallelisation factor. 2^15 costs roughly 32 MB per hash, which is a
 * deliberate brake on offline cracking while staying well inside the memory
 * budget of a serverless function.
 */
const N = 32_768;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEM = 128 * N * R * 2;

const PREFIX = 'scrypt';

/** Hashes a plain text password into a self describing, storable string. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = (await scrypt(plain.normalize('NFKC'), salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: MAX_MEM,
  })) as Buffer;

  return [PREFIX, N, R, P, salt.toString('base64'), derived.toString('base64')].join('$');
}

/**
 * Verifies a password against a stored hash in constant time.
 *
 * Returns false rather than throwing for malformed stored values, so that a
 * corrupt row cannot be distinguished from a wrong password by an attacker.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== PREFIX) return false;

    const n = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = Buffer.from(parts[4] ?? '', 'base64');
    const expected = Buffer.from(parts[5] ?? '', 'base64');

    if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
    if (salt.length === 0 || expected.length === 0) return false;

    const derived = (await scrypt(plain.normalize('NFKC'), salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: 128 * n * r * 2,
    })) as Buffer;

    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Password policy for the portal. Deliberately favours length over character
 * class gymnastics, which is what current guidance recommends.
 */
export function passwordProblems(plain: string): string[] {
  const problems: string[] = [];
  if (plain.length < 10) problems.push('Use at least 10 characters.');
  if (plain.length > 200) problems.push('Use fewer than 200 characters.');
  if (!/[a-zA-Z]/.test(plain)) problems.push('Include at least one letter.');
  if (!/[0-9]/.test(plain)) problems.push('Include at least one number.');
  if (/^\s|\s$/.test(plain)) problems.push('Remove the leading or trailing spaces.');

  const lowered = plain.toLowerCase();
  const banned = ['password', 'palmseed', '12345678', 'qwerty', 'letmein', 'admin123'];
  if (banned.some((word) => lowered.includes(word))) {
    problems.push('Choose something less predictable.');
  }

  return problems;
}
