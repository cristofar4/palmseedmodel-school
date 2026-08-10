import { describe, expect, it } from 'vitest';
import { hashPassword, passwordProblems, verifyPassword } from '@/lib/security/password';
import { hashResetCode, hashToken, safeEqual, sixDigitCode, hashIp } from '@/lib/security/tokens';
import { parseUserAgent, describeDevice } from '@/lib/security/request-context';

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const stored = await hashPassword('correct horse battery 4');
    await expect(verifyPassword('correct horse battery 4', stored)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await hashPassword('correct horse battery 4');
    await expect(verifyPassword('correct horse battery 5', stored)).resolves.toBe(false);
  });

  it('produces a different hash each time for the same password', async () => {
    const a = await hashPassword('same password 1');
    const b = await hashPassword('same password 1');
    expect(a).not.toBe(b);
    // Both still verify, which is what a per password salt buys.
    await expect(verifyPassword('same password 1', a)).resolves.toBe(true);
    await expect(verifyPassword('same password 1', b)).resolves.toBe(true);
  });

  it('returns false rather than throwing on a corrupt stored value', async () => {
    for (const corrupt of ['', 'not-a-hash', 'scrypt$1$2$3', 'bcrypt$1$2$3$4$5']) {
      await expect(verifyPassword('anything', corrupt)).resolves.toBe(false);
    }
  });

  it('records the cost parameters in the stored value', async () => {
    const stored = await hashPassword('another password 9');
    expect(stored.startsWith('scrypt$32768$8$1$')).toBe(true);
  });
});

describe('password policy', () => {
  it('accepts a reasonable password', () => {
    expect(passwordProblems('lagos sunrise 42')).toEqual([]);
  });

  it('rejects short, letterless, numberless and predictable passwords', () => {
    expect(passwordProblems('short1').length).toBeGreaterThan(0);
    expect(passwordProblems('1234567890123')).toContain('Include at least one letter.');
    expect(passwordProblems('abcdefghijkl')).toContain('Include at least one number.');
    expect(passwordProblems('palmseed1234')).toContain('Choose something less predictable.');
    expect(passwordProblems(' leading space 1')).toContain('Remove the leading or trailing spaces.');
  });
});

describe('tokens', () => {
  it('produces six digit reset codes within range', () => {
    for (let index = 0; index < 300; index += 1) {
      const code = sixDigitCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(Number(code)).toBeGreaterThanOrEqual(0);
      expect(Number(code)).toBeLessThanOrEqual(999_999);
    }
  });

  it('binds a reset code to one account', () => {
    const code = '123456';
    const forA = hashResetCode(code, 'user-a');
    const forB = hashResetCode(code, 'user-b');

    // The same code hashed for a different account must not match, otherwise
    // a code mailed to one family would work on another account.
    expect(forA).not.toBe(forB);
    expect(hashResetCode(code, 'user-a')).toBe(forA);
  });

  it('hashes session tokens deterministically and irreversibly', () => {
    const token = 'abc123';
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toHaveLength(64);
  });

  it('compares safely and correctly', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('never stores a recoverable network address', () => {
    const hashed = hashIp('102.89.23.14');
    expect(hashed).not.toBeNull();
    expect(hashed).not.toContain('102');
    expect(hashed).toHaveLength(32);
    expect(hashIp(null)).toBeNull();
    // Stable, so repeated activity from one origin can still be grouped.
    expect(hashIp('102.89.23.14')).toBe(hashed);
  });
});

describe('user agent parsing', () => {
  it('identifies an Android phone using Chrome', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Linux; Android 13; SM-A245F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    );
    expect(result).toEqual({
      deviceType: 'Phone',
      browser: 'Chrome',
      operatingSystem: 'Android',
    });
  });

  it('identifies a Windows desktop using Edge', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    );
    expect(result).toEqual({
      deviceType: 'Computer',
      browser: 'Microsoft Edge',
      operatingSystem: 'Windows',
    });
  });

  it('identifies an iPhone using Safari', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    );
    expect(result.deviceType).toBe('Phone');
    expect(result.operatingSystem).toBe('iOS');
    expect(result.browser).toBe('Safari');
  });

  it('degrades honestly when the header is absent', () => {
    expect(parseUserAgent('')).toEqual({
      deviceType: 'Unknown',
      browser: 'Unknown',
      operatingSystem: 'Unknown',
    });
    expect(describeDevice('Unknown', 'Unknown', 'Unknown')).toBe('Unrecognised device');
  });

  it('describes a device readably', () => {
    expect(describeDevice('Chrome', 'Android', 'Phone')).toBe('Chrome on Android (Phone)');
  });
});
