import { fail, guardMutation, ok, parseBody, readJson } from '@/lib/api';
import { requireApiAdmin } from '@/lib/auth/api-guards';
import { recordAudit, recordAuthEvent } from '@/lib/auth/events';
import { withPrincipal } from '@/lib/db/pool';
import { sendEmail } from '@/lib/email/send';
import { approvalEmail, rejectionEmail } from '@/lib/email/templates';
import { requestContext } from '@/lib/security/request-context';
import { reviewApplicationSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ApplicationRecord {
  id: string;
  user_id: string;
  student_profile_id: string | null;
  status: string;
  full_name: string;
  email: string;
  guardian_name: string;
  guardian_email: string;
}

/**
 * Approve or reject a registration.
 *
 * Approval is one transaction. The admission number, the class assignment, the
 * enrolment row, the account status and the application record either all
 * change together or none of them do, so a half admitted student cannot exist.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { user: admin, principal } = auth;

  const parsed = parseBody(reviewApplicationSchema, body);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  const application = await withPrincipal(principal, (tx) =>
    tx.maybeOne<ApplicationRecord>(
      `select a.id, a.user_id, a.student_profile_id, a.status,
              u.full_name, u.email, a.guardian_name, a.guardian_email
         from applications a
         join users u on u.id = a.user_id
        where a.id = $1`,
      [input.applicationId],
    ),
  );

  if (!application) return fail('That registration could not be found.', 404);
  if (application.status !== 'pending') {
    return fail(`This registration has already been ${application.status}.`, 409);
  }

  const context = await requestContext();

  /* ---------------------------------------------------------------- reject */
  if (input.decision === 'reject') {
    await withPrincipal(principal, async (tx) => {
      await tx.exec(
        `update applications
            set status = 'rejected', review_note = $2, reviewed_by = $3, reviewed_at = now()
          where id = $1`,
        [application.id, input.note, admin.id],
      );
      await tx.exec(`update users set status = 'rejected' where id = $1`, [application.user_id]);
    });

    for (const recipient of [
      { to: application.email, name: application.full_name, guardian: false },
      { to: application.guardian_email, name: application.guardian_name, guardian: true },
    ]) {
      await sendEmail({
        to: recipient.to,
        toName: recipient.name,
        template: 'registration_rejected',
        relatedUserId: application.user_id,
        createdBy: admin.id,
        principal,
        document: rejectionEmail({
          studentName: application.full_name,
          reason: input.note,
          isGuardianCopy: recipient.guardian,
          guardianName: application.guardian_name,
        }),
      });
    }

    await recordAuthEvent({
      type: 'account_rejected',
      userId: application.user_id,
      emailAttempted: application.email,
      accountStatus: 'rejected',
      context,
    });

    await recordAudit({
      principal,
      action: 'application.reject',
      entityType: 'application',
      entityId: application.id,
      summary: `Rejected the registration for ${application.full_name}`,
      changes: { note: input.note },
      ipHash: context.ipHash,
    });

    return ok({ status: 'rejected' });
  }

  /* --------------------------------------------------------------- approve */
  const result = await withPrincipal(principal, async (tx) => {
    const session = await tx.maybeOne<{ id: string; name: string; starts_on: Date }>(
      'select id, name, starts_on from academic_sessions where id = $1',
      [input.sessionId],
    );
    if (!session) throw new Error('SESSION_NOT_FOUND');

    const klass = await tx.maybeOne<{ id: string; label: string }>(
      'select id, palmseed_class_label(level, stream, arm) as label from classes where id = $1',
      [input.classId],
    );
    if (!klass) throw new Error('CLASS_NOT_FOUND');

    // Allocated inside the transaction, so two administrators approving at the
    // same moment cannot be handed the same number.
    const numberRow = await tx.one<{ admission_number: string }>(
      'select palmseed_next_admission_number($1::int) as admission_number',
      [new Date(session.starts_on).getUTCFullYear()],
    );

    // The profile exists from the admission form, but this covers the case
    // where an administrator is admitting an account created another way.
    const profile = await tx.one<{ id: string }>(
      `insert into student_profiles (user_id, admission_number, class_id, current_session_id, admitted_on)
            values ($1, $2, $3, $4, current_date)
       on conflict (user_id) do update
            set admission_number   = coalesce(student_profiles.admission_number, excluded.admission_number),
                class_id           = excluded.class_id,
                current_session_id = excluded.current_session_id,
                admitted_on        = coalesce(student_profiles.admitted_on, current_date)
         returning id, admission_number`,
      [application.user_id, numberRow.admission_number, klass.id, session.id],
    );

    const stored = await tx.one<{ admission_number: string }>(
      'select admission_number from student_profiles where id = $1',
      [profile.id],
    );

    await tx.exec(
      `insert into student_enrolments (student_profile_id, class_id, session_id)
            values ($1, $2, $3)
       on conflict (student_profile_id, session_id) do update set class_id = excluded.class_id`,
      [profile.id, klass.id, session.id],
    );

    await tx.exec(`update users set status = 'active' where id = $1`, [application.user_id]);

    await tx.exec(
      `update applications
          set status = 'approved', review_note = nullif($2, ''), reviewed_by = $3,
              reviewed_at = now(), student_profile_id = $4
        where id = $1`,
      [application.id, input.note ?? '', admin.id, profile.id],
    );

    return {
      admissionNumber: stored.admission_number,
      className: klass.label,
      sessionName: session.name,
    };
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === 'SESSION_NOT_FOUND') return 'SESSION' as const;
    if (error instanceof Error && error.message === 'CLASS_NOT_FOUND') return 'CLASS' as const;
    throw error;
  });

  if (result === 'SESSION') return fail('That academic session could not be found.', 422);
  if (result === 'CLASS') return fail('That class could not be found.', 422);

  for (const recipient of [
    { to: application.email, name: application.full_name, guardian: false },
    { to: application.guardian_email, name: application.guardian_name, guardian: true },
  ]) {
    await sendEmail({
      to: recipient.to,
      toName: recipient.name,
      template: 'registration_approved',
      relatedUserId: application.user_id,
      createdBy: admin.id,
      principal,
      document: approvalEmail({
        studentName: application.full_name,
        admissionNumber: result.admissionNumber,
        className: result.className,
        sessionName: result.sessionName,
        isGuardianCopy: recipient.guardian,
        guardianName: application.guardian_name,
      }),
    });
  }

  await recordAuthEvent({
    type: 'account_approved',
    userId: application.user_id,
    emailAttempted: application.email,
    accountStatus: 'active',
    admissionNumber: result.admissionNumber,
    context,
  });

  await recordAudit({
    principal,
    action: 'application.approve',
    entityType: 'application',
    entityId: application.id,
    summary: `Admitted ${application.full_name} to ${result.className} as ${result.admissionNumber}`,
    changes: { classId: input.classId, sessionId: input.sessionId },
    ipHash: context.ipHash,
  });

  return ok({ status: 'approved', ...result });
}
