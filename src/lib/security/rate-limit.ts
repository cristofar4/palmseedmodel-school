import 'server-only';
import { AUTHENTICATOR, withPrincipal } from '@/lib/db/pool';
import { keyedHash } from './tokens';

export interface RateLimitRule {
  /** Distinct namespace, for example 'signin' or 'reset-request'. */
  name: string;
  limit: number;
  windowSeconds: number;
  /** How long to lock the bucket once the limit is passed. */
  blockSeconds: number;
}

export const RATE_LIMITS = {
  signin: { name: 'signin', limit: 8, windowSeconds: 600, blockSeconds: 900 },
  signup: { name: 'signup', limit: 5, windowSeconds: 3600, blockSeconds: 1800 },
  resetRequest: { name: 'reset-request', limit: 5, windowSeconds: 3600, blockSeconds: 1800 },
  resetVerify: { name: 'reset-verify', limit: 10, windowSeconds: 900, blockSeconds: 1800 },
  contact: { name: 'contact', limit: 5, windowSeconds: 3600, blockSeconds: 3600 },
  resend: { name: 'resend-verification', limit: 4, windowSeconds: 3600, blockSeconds: 1800 },
} as const satisfies Record<string, RateLimitRule>;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Fixed window counter held in Postgres, so the limit is shared by every
 * serverless instance rather than being per process.
 *
 * The whole check is a single upsert. Concurrent callers serialise on the
 * primary key, which keeps the count accurate under load.
 */
export async function consumeRateLimit(
  rule: RateLimitRule,
  identifier: string,
): Promise<RateLimitResult> {
  // The identifier can be an email address or a client address, so it is
  // hashed before it is written.
  const bucket = `${rule.name}:${keyedHash(identifier).slice(0, 32)}`;

  return withPrincipal(AUTHENTICATOR, async (tx) => {
    const row = await tx.one<{
      hits: number;
      blocked_until: Date | null;
      window_start: Date;
    }>(
      `
      insert into rate_limits (bucket, hits, window_start)
        values ($1, 1, now())
      on conflict (bucket) do update set
        -- start a fresh window, otherwise add to the current one
        hits = case
                 when rate_limits.window_start < now() - make_interval(secs => $2::double precision)
                 then 1
                 else rate_limits.hits + 1
               end,
        window_start = case
                 when rate_limits.window_start < now() - make_interval(secs => $2::double precision)
                 then now()
                 else rate_limits.window_start
               end,
        blocked_until = case
                 when rate_limits.blocked_until is not null and rate_limits.blocked_until > now()
                 then rate_limits.blocked_until
                 else null
               end
      returning hits, blocked_until, window_start
      `,
      [bucket, rule.windowSeconds],
    );

    const now = Date.now();

    if (row.blocked_until && row.blocked_until.getTime() > now) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil((row.blocked_until.getTime() - now) / 1000),
      };
    }

    if (row.hits > rule.limit) {
      await tx.exec(
        'update rate_limits set blocked_until = now() + make_interval(secs => $2::double precision) where bucket = $1',
        [bucket, rule.blockSeconds],
      );
      return { allowed: false, remaining: 0, retryAfterSeconds: rule.blockSeconds };
    }

    return {
      allowed: true,
      remaining: Math.max(0, rule.limit - row.hits),
      retryAfterSeconds: 0,
    };
  });
}

/** Clears a bucket after a successful action, so one success forgives the misses. */
export async function clearRateLimit(rule: RateLimitRule, identifier: string): Promise<void> {
  const bucket = `${rule.name}:${keyedHash(identifier).slice(0, 32)}`;
  await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.exec('delete from rate_limits where bucket = $1', [bucket]),
  );
}
