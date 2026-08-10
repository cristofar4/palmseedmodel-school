import { fail, guardMutation, ok, parseBody, readJson } from '@/lib/api';
import { requireApiAdmin } from '@/lib/auth/api-guards';
import { recordAudit } from '@/lib/auth/events';
import { withPrincipal } from '@/lib/db/pool';
import { sendEmail } from '@/lib/email/send';
import { activationEmail } from '@/lib/email/templates';
import { hashPassword } from '@/lib/security/password';
import { requestContext } from '@/lib/security/request-context';
import { hashToken, randomToken } from '@/lib/security/tokens';
import { siteUrl } from '@/lib/school';
import { createTeacherSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Creates a teaching account.
 *
 * There is no public route that can produce a teacher. The account is created
 * with an unusable random password and must be claimed through the activation
 * link, so no password ever travels by email.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { user: admin, principal } = auth;

  const parsed = parseBody(createTeacherSchema, body);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  const existing = await withPrincipal(principal, (tx) =>
    tx.maybeOne<{ id: string }>('select id from users where lower(email) = lower($1)', [
      input.email,
    ]),
  );
  if (existing) {
    return fail('An account already exists for that email address.', 409, {
      fields: { email: 'This address is already in use.' },
    });
  }

  // Unguessable and never disclosed. The activation link is the only way in.
  const placeholder = await hashPassword(randomToken(24));
  const activationToken = randomToken(32);

  const created = await withPrincipal(principal, async (tx) => {
    const user = await tx.one<{ id: string }>(
      `insert into users (email, phone, full_name, password_hash, role, status, must_change_password)
       values ($1, $2, $3, $4, 'teacher', 'active', true)
       returning id`,
      [input.email, input.phone, input.fullName, placeholder],
    );

    const teacher = await tx.one<{ id: string; staff_number: string }>(
      `insert into teachers (user_id, staff_number, qualification, specialism)
       values ($1, $2, nullif($3, ''), nullif($4, ''))
       returning id, staff_number`,
      [user.id, input.staffNumber, input.qualification ?? '', input.specialism ?? ''],
    );

    await tx.exec(
      `insert into email_verification_tokens (user_id, token_hash, expires_at)
       values ($1, $2, now() + interval '7 days')`,
      [user.id, hashToken(activationToken)],
    );

    return { userId: user.id, teacherId: teacher.id, staffNumber: teacher.staff_number };
  }).catch((error: unknown) => {
    if (error instanceof Error && /teachers_staff_number_key/.test(error.message)) {
      return 'DUPLICATE_STAFF_NUMBER' as const;
    }
    throw error;
  });

  if (created === 'DUPLICATE_STAFF_NUMBER') {
    return fail('That staff number is already in use.', 409, {
      fields: { staffNumber: 'Choose a staff number that is not already taken.' },
    });
  }

  await sendEmail({
    to: input.email,
    toName: input.fullName,
    template: 'account_activation',
    relatedUserId: created.userId,
    createdBy: admin.id,
    principal,
    document: activationEmail({
      studentName: input.fullName,
      admissionNumber: created.staffNumber,
      className: 'Teaching staff',
      activationUrl: `${siteUrl()}/activate?token=${activationToken}`,
    }),
  });

  const context = await requestContext();
  await recordAudit({
    principal,
    action: 'teacher.create',
    entityType: 'user',
    entityId: created.userId,
    summary: `Created the teaching account for ${input.fullName}`,
    changes: { staffNumber: created.staffNumber },
    ipHash: context.ipHash,
  });

  return ok({ teacherId: created.teacherId }, { status: 201 });
}
