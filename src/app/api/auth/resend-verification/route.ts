import { AUTHENTICATOR, withPrincipal } from '@/lib/db/pool';
import { fail, guardMutation, ok, rateLimited, readJson } from '@/lib/api';
import { recordAuthEvent } from '@/lib/auth/events';
import { currentUser } from '@/lib/auth/session';
import { sendEmail } from '@/lib/email/send';
import { verificationEmail } from '@/lib/email/templates';
import { RATE_LIMITS, consumeRateLimit } from '@/lib/security/rate-limit';
import { requestContext } from '@/lib/security/request-context';
import { hashToken, randomToken } from '@/lib/security/tokens';
import { siteUrl } from '@/lib/school';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const user = await currentUser();
  if (!user) return fail('Please sign in again.', 401);

  if (user.emailVerifiedAt) {
    return ok({ message: 'This email address is already confirmed.' });
  }

  const limit = await consumeRateLimit(RATE_LIMITS.resend, user.id);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

  const token = randomToken(32);

  await withPrincipal(AUTHENTICATOR, async (tx) => {
    await tx.exec(
      `update email_verification_tokens set consumed_at = now()
        where user_id = $1 and consumed_at is null`,
      [user.id],
    );
    await tx.exec(
      `insert into email_verification_tokens (user_id, token_hash, expires_at)
       values ($1, $2, now() + interval '24 hours')`,
      [user.id, hashToken(token)],
    );
  });

  await sendEmail({
    to: user.email,
    toName: user.fullName,
    template: 'email_verification',
    relatedUserId: user.id,
    document: verificationEmail({
      fullName: user.fullName,
      verifyUrl: `${siteUrl()}/api/auth/verify?token=${token}`,
    }),
  });

  await recordAuthEvent({
    type: 'email_verification_sent',
    userId: user.id,
    emailAttempted: user.email,
    context: await requestContext(),
  });

  return ok({ message: 'A new confirmation link is on its way.' });
}
