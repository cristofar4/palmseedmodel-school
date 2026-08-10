import { AUTHENTICATOR, withPrincipal } from '@/lib/db/pool';
import { fail, guardMutation, ok, parseBody, rateLimited, readJson } from '@/lib/api';
import { recordAuthEvent } from '@/lib/auth/events';
import { revokeAllSessions } from '@/lib/auth/session';
import { sendEmail } from '@/lib/email/send';
import { passwordChangedEmail } from '@/lib/email/templates';
import { hashPassword, passwordProblems } from '@/lib/security/password';
import { RATE_LIMITS, consumeRateLimit } from '@/lib/security/rate-limit';
import { requestContext } from '@/lib/security/request-context';
import { hashResetCode, safeEqual } from '@/lib/security/tokens';
import { completeResetSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 5;

interface CodeRow {
  id: string;
  user_id: string;
  code_hash: string;
  attempts: number;
  full_name: string;
  email: string;
  status: string;
}

/**
 * Completes a reset.
 *
 * The code must be unexpired, unused, not superseded, and within the attempt
 * budget. A wrong code costs an attempt, and the fifth wrong attempt burns the
 * code entirely.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const parsed = parseBody(completeResetSchema, body);
  if (parsed.response) return parsed.response;
  const { email, code, password } = parsed.data;

  const context = await requestContext();

  for (const key of [context.ipHash ?? 'unknown-host', email]) {
    const limit = await consumeRateLimit(RATE_LIMITS.resetVerify, key);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
  }

  const problems = passwordProblems(password);
  if (problems.length > 0) {
    return fail('Please choose a stronger password.', 422, {
      fields: { password: problems.join(' ') },
    });
  }

  const record = await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.maybeOne<CodeRow>(
      `select c.id, c.user_id, c.code_hash, c.attempts,
              u.full_name, u.email, u.status
         from password_reset_codes c
         join users u on u.id = c.user_id
        where lower(u.email) = lower($1)
          and c.consumed_at is null
          and c.invalidated_at is null
          and c.expires_at > now()
        order by c.created_at desc
        limit 1`,
      [email],
    ),
  );

  const invalidCode = fail('That code is not valid or it has expired.', 400, {
    fields: { code: 'Check the code, or ask for a new one.' },
  });

  if (!record) {
    await recordAuthEvent({
      type: 'password_reset_failed',
      emailAttempted: email,
      context,
      detail: { reason: 'no_active_code' },
    });
    return invalidCode;
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await withPrincipal(AUTHENTICATOR, (tx) =>
      tx.exec('update password_reset_codes set invalidated_at = now() where id = $1', [record.id]),
    );
    return fail('That code has been tried too many times. Please request a new one.', 429);
  }

  if (!safeEqual(hashResetCode(code, record.user_id), record.code_hash)) {
    const attempts = await withPrincipal(AUTHENTICATOR, (tx) =>
      tx.one<{ attempts: number }>(
        `update password_reset_codes
            set attempts = attempts + 1,
                invalidated_at = case when attempts + 1 >= $2 then now() else invalidated_at end
          where id = $1
        returning attempts`,
        [record.id, MAX_ATTEMPTS],
      ),
    );

    await recordAuthEvent({
      type: 'password_reset_failed',
      userId: record.user_id,
      emailAttempted: record.email,
      context,
      detail: { reason: 'wrong_code', attempts: attempts.attempts },
    });

    const remaining = Math.max(0, MAX_ATTEMPTS - attempts.attempts);
    return fail(
      remaining > 0
        ? `That code is not correct. You have ${remaining} attempt${remaining === 1 ? '' : 's'} left.`
        : 'That code has been tried too many times. Please request a new one.',
      400,
      { fields: { code: 'Check the six digit code from the email.' } },
    );
  }

  const passwordHash = await hashPassword(password);

  await withPrincipal(AUTHENTICATOR, async (tx) => {
    await tx.exec('update password_reset_codes set consumed_at = now() where id = $1', [record.id]);
    await tx.exec(
      'update users set password_hash = $2, must_change_password = false where id = $1',
      [record.user_id, passwordHash],
    );
  });

  // Everything that was signed in with the old password is signed out.
  const revoked = await revokeAllSessions(record.user_id);

  await sendEmail({
    to: record.email,
    toName: record.full_name,
    template: 'password_changed',
    relatedUserId: record.user_id,
    document: passwordChangedEmail({
      fullName: record.full_name,
      revokedSessions: revoked,
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
    type: 'password_changed',
    userId: record.user_id,
    emailAttempted: record.email,
    accountStatus: record.status,
    context,
    detail: { via: 'reset_code', revokedSessions: revoked },
  });

  return ok({ next: '/signin', message: 'Your password has been changed. Please sign in.' });
}
