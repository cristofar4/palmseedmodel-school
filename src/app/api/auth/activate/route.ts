import { z } from 'zod';
import { AUTHENTICATOR, withPrincipal } from '@/lib/db/pool';
import { fail, guardMutation, ok, parseBody, rateLimited, readJson } from '@/lib/api';
import { recordAuthEvent } from '@/lib/auth/events';
import { createSession } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { hashPassword, passwordProblems } from '@/lib/security/password';
import { RATE_LIMITS, consumeRateLimit } from '@/lib/security/rate-limit';
import { requestContext } from '@/lib/security/request-context';
import { hashToken } from '@/lib/security/tokens';
import { passwordSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  token: z.string().min(10, 'The activation link is incomplete.'),
  password: passwordSchema,
});

/**
 * Claims an account created by an administrator, whether a teacher or an
 * existing enrolled student.
 *
 * The activation token doubles as proof of the email address, so the account
 * is marked confirmed at the same time. No password was ever sent by email,
 * which is why this flow exists at all.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const parsed = parseBody(schema, body);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  const context = await requestContext();

  const limit = await consumeRateLimit(RATE_LIMITS.resetVerify, context.ipHash ?? 'activation');
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

  const problems = passwordProblems(input.password);
  if (problems.length > 0) {
    return fail('Please choose a stronger password.', 422, {
      fields: { password: problems.join(' ') },
    });
  }

  const record = await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.maybeOne<{
      token_id: string;
      user_id: string;
      email: string;
      full_name: string;
      role: 'student' | 'teacher' | 'admin';
      status: string;
    }>(
      `select t.id as token_id, u.id as user_id, u.email, u.full_name, u.role, u.status
         from email_verification_tokens t
         join users u on u.id = t.user_id
        where t.token_hash = $1
          and t.consumed_at is null
          and t.expires_at > now()`,
      [hashToken(input.token)],
    ),
  );

  if (!record) {
    return fail('That activation link is not valid or it has expired.', 400);
  }

  if (record.status === 'suspended' || record.status === 'rejected') {
    return fail('This account is not active. Please contact the school office.', 403);
  }

  const passwordHash = await hashPassword(input.password);

  await withPrincipal(AUTHENTICATOR, async (tx) => {
    await tx.exec('update email_verification_tokens set consumed_at = now() where id = $1', [
      record.token_id,
    ]);
    await tx.exec(
      `update users
          set password_hash = $2,
              must_change_password = false,
              email_verified_at = coalesce(email_verified_at, now())
        where id = $1`,
      [record.user_id, passwordHash],
    );
  });

  await createSession(record.user_id, context);

  await recordAuthEvent({
    type: 'account_activated',
    userId: record.user_id,
    emailAttempted: record.email,
    accountStatus: record.status,
    context,
  });

  await recordAuthEvent({
    type: 'login_success',
    userId: record.user_id,
    emailAttempted: record.email,
    accountStatus: record.status,
    context,
    detail: { via: 'activation' },
  });

  return ok({ next: homeFor(record.role) });
}
