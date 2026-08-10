import { AUTHENTICATOR, withPrincipal } from '@/lib/db/pool';
import { fail, guardMutation, ok, parseBody, rateLimited, readJson } from '@/lib/api';
import { recordAuthEvent } from '@/lib/auth/events';
import { createSession } from '@/lib/auth/session';
import { sendEmail } from '@/lib/email/send';
import { verificationEmail } from '@/lib/email/templates';
import { hashPassword, passwordProblems } from '@/lib/security/password';
import { RATE_LIMITS, consumeRateLimit } from '@/lib/security/rate-limit';
import { requestContext } from '@/lib/security/request-context';
import { hashToken, randomToken } from '@/lib/security/tokens';
import { siteUrl } from '@/lib/school';
import { signupSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VERIFICATION_HOURS = 24;

/**
 * Step one of public registration.
 *
 * Creates the account in Pending Review, signs the person in so they can reach
 * the limited dashboard right away, and sends the verification message. The
 * admission details are collected next, by /api/auth/application.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const parsed = parseBody(signupSchema, body);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  const context = await requestContext();

  const limit = await consumeRateLimit(RATE_LIMITS.signup, context.ipHash ?? input.email);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

  const problems = passwordProblems(input.password);
  if (problems.length > 0) {
    return fail('Please choose a stronger password.', 422, {
      fields: { password: problems.join(' ') },
    });
  }

  const existing = await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.maybeOne<{ id: string }>('select id from users where lower(email) = lower($1)', [
      input.email,
    ]),
  );

  if (existing) {
    // The address is already known, so the account is not created again. The
    // wording avoids confirming or denying anything beyond what the person
    // typed, and points at recovery instead.
    return fail('An account already exists for this email address.', 409, {
      fields: { email: 'This email address is already registered. Try signing in instead.' },
    });
  }

  const passwordHash = await hashPassword(input.password);
  const verificationToken = randomToken(32);

  let userId: string;
  try {
    userId = await withPrincipal(AUTHENTICATOR, async (tx) => {
      const user = await tx.one<{ id: string }>(
        `insert into users (email, phone, full_name, password_hash, role, status)
         values ($1, $2, $3, $4, 'student', 'pending_review')
         returning id`,
        [input.email, input.phone, input.fullName, passwordHash],
      );

      await tx.exec(
        `insert into email_verification_tokens (user_id, token_hash, expires_at)
         values ($1, $2, now() + make_interval(hours => $3::int))`,
        [user.id, hashToken(verificationToken), VERIFICATION_HOURS],
      );

      return user.id;
    });
  } catch (error) {
    // The unique index is the real guard against two simultaneous signups.
    if (error instanceof Error && /users_email_unique/.test(error.message)) {
      return fail('An account already exists for this email address.', 409, {
        fields: { email: 'This email address is already registered.' },
      });
    }
    throw error;
  }

  await createSession(userId, context);

  await recordAuthEvent({
    type: 'signup',
    userId,
    emailAttempted: input.email,
    accountStatus: 'pending_review',
    context,
  });

  // Points at the route handler, which is what consumes the token and then
  // redirects to the /verify page with the outcome. Linking straight to the
  // page would show a status screen without ever confirming the address.
  const verifyUrl = `${siteUrl()}/api/auth/verify?token=${verificationToken}`;

  // Delivery problems are recorded in the ledger and must not fail the signup.
  await sendEmail({
    to: input.email,
    toName: input.fullName,
    template: 'email_verification',
    relatedUserId: userId,
    document: verificationEmail({ fullName: input.fullName, verifyUrl }),
  });

  await recordAuthEvent({
    type: 'email_verification_sent',
    userId,
    emailAttempted: input.email,
    context,
  });

  return ok({ next: '/signup/details' }, { status: 201 });
}
