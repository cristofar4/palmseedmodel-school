import { AUTHENTICATOR, withPrincipal } from '@/lib/db/pool';
import { fail, guardMutation, ok, parseBody, rateLimited, readJson } from '@/lib/api';
import { recordAuthEvent } from '@/lib/auth/events';
import { createSession, isNewDevice, lastSuccessfulLogin } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { adminNotificationAddress, sendEmail } from '@/lib/email/send';
import { adminLoginNoticeEmail, newDeviceEmail } from '@/lib/email/templates';
import { verifyPassword } from '@/lib/security/password';
import { RATE_LIMITS, clearRateLimit, consumeRateLimit } from '@/lib/security/rate-limit';
import { requestContext } from '@/lib/security/request-context';
import { loginNotificationMode, shouldNotifyAdmin } from '@/lib/settings';
import { signinSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A sign in after this long counts as a return from a long absence. */
const LONG_ABSENCE_DAYS = 45;

interface CandidateRow {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role: 'student' | 'teacher' | 'admin';
  status: string;
  admission_number: string | null;
}

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const parsed = parseBody(signinSchema, body);
  if (parsed.response) return parsed.response;
  const { identifier, password } = parsed.data;

  const context = await requestContext();

  // Limited by address and by identifier, so one noisy network cannot lock out
  // an account and one targeted account cannot be ground down from many hosts.
  for (const key of [context.ipHash ?? 'unknown-host', identifier.toLowerCase()]) {
    const limit = await consumeRateLimit(RATE_LIMITS.signin, key);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
  }

  // An active student may sign in with an email address or an admission number.
  const candidate = await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.maybeOne<CandidateRow>(
      `select u.id, u.email, u.full_name, u.password_hash, u.role, u.status,
              sp.admission_number
         from users u
         left join student_profiles sp on sp.user_id = u.id
        where lower(u.email) = lower($1)
           or upper(sp.admission_number) = upper($1)
        limit 1`,
      [identifier],
    ),
  );

  const genericFailure = fail('Those sign in details are not correct.', 401, {
    fields: { password: 'Check the email address or admission number and the password.' },
  });

  if (!candidate) {
    // A dummy verification keeps the response time for an unknown account close
    // to a known one, so the endpoint does not confirm which addresses exist.
    await verifyPassword(password, 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA');
    await recordAuthEvent({
      type: 'login_failed',
      emailAttempted: identifier,
      context,
      detail: { reason: 'unknown_account' },
    });
    return genericFailure;
  }

  const passwordMatches = await verifyPassword(password, candidate.password_hash);

  if (!passwordMatches) {
    await recordAuthEvent({
      type: 'login_failed',
      userId: candidate.id,
      emailAttempted: candidate.email,
      accountStatus: candidate.status,
      admissionNumber: candidate.admission_number,
      context,
      detail: { reason: 'wrong_password' },
    });
    return genericFailure;
  }

  if (candidate.status === 'suspended' || candidate.status === 'rejected') {
    await recordAuthEvent({
      type: 'login_failed',
      userId: candidate.id,
      emailAttempted: candidate.email,
      accountStatus: candidate.status,
      context,
      detail: { reason: 'account_not_permitted' },
    });

    return fail(
      candidate.status === 'suspended'
        ? 'This account is suspended. Please contact the school office.'
        : 'This registration was not approved. Please contact the school office.',
      403,
    );
  }

  // Establish whether this is a familiar device before the new session is
  // written, otherwise the session being created would itself be the match.
  const newDevice = await isNewDevice(candidate.id, context.deviceLabel);
  const previousLogin = await lastSuccessfulLogin(candidate.id);
  const longAbsence =
    previousLogin !== null &&
    Date.now() - previousLogin.getTime() > LONG_ABSENCE_DAYS * 24 * 60 * 60 * 1000;

  await createSession(candidate.id, context);

  await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.exec('update users set last_login_at = now() where id = $1', [candidate.id]),
  );

  await recordAuthEvent({
    type: 'login_success',
    userId: candidate.id,
    emailAttempted: candidate.email,
    accountStatus: candidate.status,
    admissionNumber: candidate.admission_number,
    isNewDevice: newDevice,
    context,
    detail: { longAbsence },
  });

  await clearRateLimit(RATE_LIMITS.signin, identifier.toLowerCase());

  const snapshot = {
    deviceLabel: context.deviceLabel,
    browser: context.browser,
    operatingSystem: context.operatingSystem,
    region: context.region,
    when: new Date(),
  };

  // The account holder hears about anything out of the ordinary.
  if (newDevice || longAbsence) {
    await sendEmail({
      to: candidate.email,
      toName: candidate.full_name,
      template: 'login_security_notice',
      relatedUserId: candidate.id,
      document: newDeviceEmail({
        fullName: candidate.full_name,
        snapshot,
        reason: newDevice ? 'new_device' : 'long_absence',
      }),
    });
  }

  // The administrator hears about student sign ins, subject to the setting.
  if (candidate.role === 'student') {
    const mode = await loginNotificationMode();
    if (shouldNotifyAdmin(mode, newDevice || longAbsence)) {
      await sendEmail({
        to: adminNotificationAddress(),
        toName: 'Palmseed Administrator',
        template: 'admin_login_notice',
        relatedUserId: candidate.id,
        document: adminLoginNoticeEmail({
          studentName: candidate.full_name,
          email: candidate.email,
          admissionNumber: candidate.admission_number,
          accountStatus: candidate.status,
          snapshot,
          suspicious: newDevice || longAbsence,
        }),
      });
    }
  }

  return ok({ next: homeFor(candidate.role), role: candidate.role });
}
