import { NextResponse } from 'next/server';
import { AUTHENTICATOR, withPrincipal } from '@/lib/db/pool';
import { recordAuthEvent } from '@/lib/auth/events';
import { requestContext } from '@/lib/security/request-context';
import { hashToken } from '@/lib/security/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Confirms an email address from the link in the verification message.
 *
 * This is a GET because it is opened from an email client. It is safe to
 * repeat: a token that has already been used simply reports that the address
 * is confirmed rather than failing.
 */
export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get('token');

  /**
   * Resolved against the incoming request rather than NEXT_PUBLIC_SITE_URL.
   *
   * This is a same origin redirect, so it should land wherever the visitor
   * already is. Building it from configuration means a stale or mistyped site
   * URL breaks email confirmation for everybody, which is exactly the kind of
   * failure that is hard to notice until families start complaining.
   */
  const back = (state: string) => new URL(`/verify?state=${state}`, requestUrl).toString();

  if (!token) {
    return NextResponse.redirect(back('missing'), { status: 303 });
  }

  const result = await withPrincipal(AUTHENTICATOR, async (tx) => {
    const row = await tx.maybeOne<{
      id: string;
      user_id: string;
      consumed_at: Date | null;
      expired: boolean;
      email: string;
      status: string;
      already_verified: boolean;
    }>(
      `select t.id, t.user_id, t.consumed_at,
              (t.expires_at <= now()) as expired,
              u.email, u.status,
              (u.email_verified_at is not null) as already_verified
         from email_verification_tokens t
         join users u on u.id = t.user_id
        where t.token_hash = $1`,
      [hashToken(token)],
    );

    if (!row) return { state: 'invalid' as const };
    if (row.already_verified) return { state: 'already' as const, ...row };
    if (row.consumed_at) return { state: 'already' as const, ...row };
    if (row.expired) return { state: 'expired' as const, ...row };

    await tx.exec('update email_verification_tokens set consumed_at = now() where id = $1', [row.id]);
    await tx.exec('update users set email_verified_at = now() where id = $1', [row.user_id]);

    return { state: 'verified' as const, ...row };
  });

  if (result.state === 'verified') {
    await recordAuthEvent({
      type: 'email_verified',
      userId: result.user_id,
      emailAttempted: result.email,
      accountStatus: result.status,
      context: await requestContext(),
    });
  }

  return NextResponse.redirect(back(result.state), { status: 303 });
}
