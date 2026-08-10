import { AUTHENTICATOR, withPrincipal } from '@/lib/db/pool';
import { guardMutation, ok, parseBody, rateLimited, readJson } from '@/lib/api';
import { recordAuthEvent } from '@/lib/auth/events';
import { sendEmail } from '@/lib/email/send';
import { passwordResetEmail } from '@/lib/email/templates';
import { RATE_LIMITS, consumeRateLimit } from '@/lib/security/rate-limit';
import { requestContext } from '@/lib/security/request-context';
import { hashResetCode, sixDigitCode } from '@/lib/security/tokens';
import { requestResetSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CODE_MINUTES = 10;

/**
 * Issues a six digit reset code.
 *
 * The response is identical whether or not the address is registered, so this
 * endpoint cannot be used to discover which families have accounts.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const parsed = parseBody(requestResetSchema, body);
  if (parsed.response) return parsed.response;
  const { email } = parsed.data;

  const context = await requestContext();

  for (const key of [context.ipHash ?? 'unknown-host', email]) {
    const limit = await consumeRateLimit(RATE_LIMITS.resetRequest, key);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
  }

  const account = await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.maybeOne<{ id: string; full_name: string; email: string; status: string }>(
      'select id, full_name, email, status from users where lower(email) = lower($1)',
      [email],
    ),
  );

  const acknowledgement = ok({
    message: 'If that address has an account, a six digit code is on its way.',
  });

  if (!account || account.status === 'rejected') return acknowledgement;

  const code = sixDigitCode();

  await withPrincipal(AUTHENTICATOR, async (tx) => {
    // Requesting a new code cancels every earlier one for this account.
    await tx.exec(
      `update password_reset_codes
          set invalidated_at = now()
        where user_id = $1 and consumed_at is null and invalidated_at is null`,
      [account.id],
    );

    await tx.exec(
      `insert into password_reset_codes (user_id, code_hash, expires_at, ip_hash)
       values ($1, $2, now() + make_interval(mins => $3::int), $4)`,
      [account.id, hashResetCode(code, account.id), CODE_MINUTES, context.ipHash],
    );
  });

  await sendEmail({
    to: account.email,
    toName: account.full_name,
    template: 'password_reset_code',
    relatedUserId: account.id,
    document: passwordResetEmail({
      fullName: account.full_name,
      code,
      snapshot: {
        deviceLabel: context.deviceLabel,
        browser: context.browser,
        operatingSystem: context.operatingSystem,
        region: context.region,
        when: new Date(),
      },
    }),
  });

  await recordAuthEvent({
    type: 'password_reset_requested',
    userId: account.id,
    emailAttempted: account.email,
    accountStatus: account.status,
    context,
  });

  return acknowledgement;
}
