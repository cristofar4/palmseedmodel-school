import { AUTHENTICATOR, withPrincipal } from '@/lib/db/pool';
import { fail, guardMutation, ok, parseBody, readJson } from '@/lib/api';
import { recordAuthEvent } from '@/lib/auth/events';
import { currentUser, revokeAllSessions } from '@/lib/auth/session';
import { sendEmail } from '@/lib/email/send';
import { passwordChangedEmail } from '@/lib/email/templates';
import { hashPassword, passwordProblems, verifyPassword } from '@/lib/security/password';
import { requestContext } from '@/lib/security/request-context';
import { changePasswordSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Password change from inside the portal.
 *
 * The current session survives, every other one is revoked, and the account
 * holder is emailed either way.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const user = await currentUser();
  if (!user) return fail('Please sign in again.', 401);

  const parsed = parseBody(changePasswordSchema, body);
  if (parsed.response) return parsed.response;
  const { currentPassword, newPassword } = parsed.data;

  const record = await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.one<{ password_hash: string }>('select password_hash from users where id = $1', [user.id]),
  );

  if (!(await verifyPassword(currentPassword, record.password_hash))) {
    await recordAuthEvent({
      type: 'password_reset_failed',
      userId: user.id,
      emailAttempted: user.email,
      context: await requestContext(),
      detail: { reason: 'wrong_current_password' },
    });
    return fail('Your current password is not correct.', 400, {
      fields: { currentPassword: 'That is not the password on this account.' },
    });
  }

  if (await verifyPassword(newPassword, record.password_hash)) {
    return fail('Choose a password you have not used here before.', 422, {
      fields: { newPassword: 'This is the password you are already using.' },
    });
  }

  const problems = passwordProblems(newPassword);
  if (problems.length > 0) {
    return fail('Please choose a stronger password.', 422, {
      fields: { newPassword: problems.join(' ') },
    });
  }

  const newHash = await hashPassword(newPassword);
  await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.exec('update users set password_hash = $2, must_change_password = false where id = $1', [
      user.id,
      newHash,
    ]),
  );

  const revoked = await revokeAllSessions(user.id, user.sessionId);
  const context = await requestContext();

  await sendEmail({
    to: user.email,
    toName: user.fullName,
    template: 'password_changed',
    relatedUserId: user.id,
    document: passwordChangedEmail({
      fullName: user.fullName,
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
    userId: user.id,
    emailAttempted: user.email,
    accountStatus: user.status,
    context,
    detail: { via: 'portal', revokedSessions: revoked },
  });

  return ok({
    message:
      revoked > 0
        ? `Your password has been changed. ${revoked} other signed in device${revoked === 1 ? ' was' : 's were'} signed out.`
        : 'Your password has been changed.',
  });
}
