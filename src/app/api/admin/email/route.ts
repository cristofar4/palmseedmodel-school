import { fail, guardMutation, ok, parseBody, readJson } from '@/lib/api';
import { requireApiAdmin } from '@/lib/auth/api-guards';
import { recordAudit } from '@/lib/auth/events';
import { withPrincipal, type Principal } from '@/lib/db/pool';
import { sendEmail } from '@/lib/email/send';
import { composedEmail } from '@/lib/email/templates';
import { requestContext } from '@/lib/security/request-context';
import { composeEmailSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Recipient {
  email: string;
  name: string | null;
  userId: string | null;
}

type Audience =
  | 'student'
  | 'guardian'
  | 'class'
  | 'all_students'
  | 'all_guardians'
  | 'students_and_guardians';

/**
 * Resolves an audience to a concrete address list.
 *
 * Only enrolled and pending accounts are included. Rejected and suspended
 * accounts are left out, because a school should not keep mailing a family
 * whose registration it has already turned down.
 */
async function resolveRecipients(
  principal: Principal,
  audience: Audience,
  targetUserId: string | null,
  classId: string | null,
): Promise<Recipient[]> {
  return withPrincipal(principal, async (tx) => {
    const eligible = `u.role = 'student' and u.status in ('active','pending_review','graduated')`;

    switch (audience) {
      case 'student':
        return tx.rows<Recipient>(
          `select u.email, u.full_name as name, u.id as "userId"
             from users u where u.id = $1`,
          [targetUserId],
        );

      case 'guardian':
        return tx.rows<Recipient>(
          `select g.email, g.full_name as name, u.id as "userId"
             from guardian_profiles g
             join student_profiles sp on sp.id = g.student_profile_id
             join users u             on u.id = sp.user_id
            where u.id = $1 and g.is_primary`,
          [targetUserId],
        );

      case 'class':
        return tx.rows<Recipient>(
          `select u.email, u.full_name as name, u.id as "userId"
             from users u
             join student_profiles sp on sp.user_id = u.id
            where sp.class_id = $1 and ${eligible}`,
          [classId],
        );

      case 'all_students':
        return tx.rows<Recipient>(
          `select u.email, u.full_name as name, u.id as "userId"
             from users u where ${eligible}`,
        );

      case 'all_guardians':
        return tx.rows<Recipient>(
          `select distinct g.email, g.full_name as name, u.id as "userId"
             from guardian_profiles g
             join student_profiles sp on sp.id = g.student_profile_id
             join users u             on u.id = sp.user_id
            where g.is_primary and ${eligible}`,
        );

      case 'students_and_guardians':
        return tx.rows<Recipient>(
          `select u.email, u.full_name as name, u.id as "userId"
             from users u where ${eligible}
           union
           select g.email, g.full_name as name, u.id as "userId"
             from guardian_profiles g
             join student_profiles sp on sp.id = g.student_profile_id
             join users u             on u.id = sp.user_id
            where g.is_primary and ${eligible}`,
        );
    }
  });
}

/** Sends a message composed in the administrator dashboard. */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { user: admin, principal } = auth;

  const parsed = parseBody(composeEmailSchema, body);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  if ((input.audience === 'student' || input.audience === 'guardian') && !input.targetUserId) {
    return fail('Choose the student this message is about.', 422, {
      fields: { targetUserId: 'Select a student.' },
    });
  }
  if (input.audience === 'class' && !input.classId) {
    return fail('Choose the class this message goes to.', 422, {
      fields: { classId: 'Select a class.' },
    });
  }

  const recipients = await resolveRecipients(
    principal,
    input.audience,
    input.targetUserId || null,
    input.classId || null,
  );

  if (recipients.length === 0) {
    return fail('There are no recipients matching that audience.', 422);
  }

  const campaignId = await withPrincipal(principal, async (tx) => {
    const row = await tx.one<{ id: string }>(
      `insert into email_campaigns
         (subject, body, audience, class_id, target_user_id, recipient_count, created_by)
       values ($1,$2,$3,nullif($4,'')::uuid,nullif($5,'')::uuid,$6,$7)
       returning id`,
      [
        input.subject,
        input.body,
        input.audience,
        input.classId ?? '',
        input.targetUserId ?? '',
        recipients.length,
        admin.id,
      ],
    );
    return row.id;
  });

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const result = await sendEmail({
      to: recipient.email,
      toName: recipient.name,
      template: 'admin_composed',
      relatedUserId: recipient.userId,
      createdBy: admin.id,
      campaignId,
      principal,
      document: composedEmail({
        recipientName: recipient.name,
        subject: input.subject,
        body: input.body,
      }),
    });

    if (result.status === 'failed') failed += 1;
    else sent += 1;
  }

  const context = await requestContext();
  await recordAudit({
    principal,
    action: 'email.compose',
    entityType: 'email_campaign',
    entityId: campaignId,
    summary: `Sent "${input.subject}" to ${recipients.length} recipient(s)`,
    changes: { audience: input.audience, sent, failed },
    ipHash: context.ipHash,
  });

  return ok({
    campaignId,
    recipients: recipients.length,
    sent,
    failed,
    message: `Message queued for ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}.`,
  });
}
