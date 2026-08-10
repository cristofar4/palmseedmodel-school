import { describe, expect, it } from 'vitest';
import { assertUsableConnectionString, redact } from '../../src/lib/db/connection';

const GOOD =
  'postgresql://postgres.abcdefg:Sup3rSecret@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require';

describe('connection string checking', () => {
  it('accepts a well formed Supabase pooler string', () => {
    expect(() => assertUsableConnectionString(GOOD, 'DATABASE_URL')).not.toThrow();
  });

  it('accepts the direct connection too', () => {
    expect(() =>
      assertUsableConnectionString(
        'postgresql://postgres:Sup3rSecret@db.abcdefg.supabase.co:5432/postgres',
        'DATABASE_URL',
      ),
    ).not.toThrow();
  });

  /* Each of these is a mistake someone actually made while deploying this. The
     point of the check is that the message names the mistake, so the assertions
     are on the wording rather than merely on it throwing. */
  const cases: ReadonlyArray<readonly [string, string, string]> = [
    [
      'the Supabase placeholder brackets left in place',
      'postgresql://postgres:[YOUR-PASSWORD]@db.abcdefg.supabase.co:5432/postgres',
      'square bracket',
    ],
    [
      'a region placeholder left in the host',
      'postgresql://postgres.abc:pw@aws-0-<region>.pooler.supabase.com:5432/postgres',
      '<region>',
    ],
    ['only a host name', 'db.abcdefg.supabase.co:5432/postgres', 'begin with postgresql://'],
    [
      'a port that is not a number',
      'postgresql://postgres:pw@db.abcdefg.supabase.co:port/postgres',
      'is not a port number',
    ],
    [
      'no database named',
      'postgresql://postgres:pw@db.abcdefg.supabase.co:5432',
      'names no database',
    ],
    [
      'no password',
      'postgresql://postgres@db.abcdefg.supabase.co:5432/postgres',
      'has no password',
    ],
    ['a stray newline', `${GOOD}\n`, 'whitespace or a line break'],
  ];

  it.each(cases)('names the problem: %s', (_label, value, expected) => {
    expect(() => assertUsableConnectionString(value, 'DATABASE_URL')).toThrowError(
      new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
  });

  it('never puts the password in the message', () => {
    try {
      assertUsableConnectionString(
        'postgresql://postgres:[HUNTER2SECRET]@db.abcdefg.supabase.co:5432/postgres',
        'DATABASE_URL',
      );
      throw new Error('should have thrown');
    } catch (error) {
      expect((error as Error).message).not.toContain('HUNTER2SECRET');
      expect((error as Error).message).toContain('********');
    }
  });

  it('redacts the password and keeps everything else legible', () => {
    expect(redact(GOOD)).toBe(
      'postgresql://postgres.abcdefg:********@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require',
    );
  });
});
