import { AUTHENTICATOR, withPrincipal } from '@/lib/db/pool';
import { fail, guardMutation, ok, parseBody, readJson } from '@/lib/api';
import { currentUser } from '@/lib/auth/session';
import { adminNotificationAddress, sendEmail } from '@/lib/email/send';
import { adminNewAccountEmail, welcomeEmail } from '@/lib/email/templates';
import { requestContext } from '@/lib/security/request-context';
import { applicationSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Step two of public registration: the admission details.
 *
 * Runs as the authenticator rather than as the student, because it creates the
 * student profile and guardian record, which a student principal is not
 * allowed to insert. The account is resolved from the session first, so the
 * rows can only ever be attached to the person who is signed in.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const user = await currentUser();
  if (!user) return fail('Please sign in to continue your registration.', 401);
  if (user.role !== 'student') {
    return fail('Only a student account can submit an admission form.', 403);
  }

  const parsed = parseBody(applicationSchema, body);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  const already = await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.maybeOne<{ id: string; status: string }>(
      `select id, status from applications where user_id = $1 order by submitted_at desc limit 1`,
      [user.id],
    ),
  );

  if (already) {
    return fail('An admission form has already been submitted for this account.', 409);
  }

  const applicationId = await withPrincipal(AUTHENTICATOR, async (tx) => {
    const profile = await tx.one<{ id: string }>(
      `insert into student_profiles
         (user_id, date_of_birth, gender, previous_school, home_address)
       values ($1, $2, $3, nullif($4, ''), nullif($5, ''))
       on conflict (user_id) do update set
         date_of_birth = excluded.date_of_birth,
         gender = excluded.gender,
         previous_school = excluded.previous_school,
         home_address = excluded.home_address
       returning id`,
      [
        user.id,
        input.dateOfBirth,
        input.gender ?? null,
        input.previousSchool ?? '',
        input.homeAddress ?? '',
      ],
    );

    await tx.exec(
      `insert into guardian_profiles
         (student_profile_id, full_name, email, phone, relationship, address, is_primary)
       values ($1, $2, $3, $4, $5, nullif($6, ''), true)`,
      [
        profile.id,
        input.guardianName,
        input.guardianEmail,
        input.guardianPhone,
        input.guardianRelationship,
        input.homeAddress ?? '',
      ],
    );

    const application = await tx.one<{ id: string }>(
      `insert into applications (
         user_id, student_profile_id, class_applying_for, stream_preference,
         date_of_birth, gender, previous_school,
         guardian_name, guardian_email, guardian_phone, guardian_relationship,
         home_address, guardian_consent, terms_accepted_at, status
       ) values ($1,$2,$3,$4,$5,$6,nullif($7,''),$8,$9,$10,$11,nullif($12,''),true,now(),'pending')
       returning id`,
      [
        user.id,
        profile.id,
        input.classApplyingFor,
        input.streamPreference ?? null,
        input.dateOfBirth,
        input.gender ?? null,
        input.previousSchool ?? '',
        input.guardianName,
        input.guardianEmail,
        input.guardianPhone,
        input.guardianRelationship,
        input.homeAddress ?? '',
      ],
    );

    return application.id;
  });

  const context = await requestContext();

  // Confirmation to the family.
  await sendEmail({
    to: user.email,
    toName: user.fullName,
    template: 'welcome',
    relatedUserId: user.id,
    document: welcomeEmail({
      fullName: user.fullName,
      classApplyingFor: input.classApplyingFor,
    }),
  });

  // Immediate notice to the school office.
  await sendEmail({
    to: adminNotificationAddress(),
    toName: 'Palmseed Administrator',
    template: 'admin_new_account',
    relatedUserId: user.id,
    metadata: { applicationId, region: context.region },
    document: adminNewAccountEmail({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      classApplyingFor: input.classApplyingFor,
      guardianName: input.guardianName,
      guardianEmail: input.guardianEmail,
      guardianPhone: input.guardianPhone,
      applicationId,
      when: new Date(),
    }),
  });

  return ok({ next: '/dashboard', applicationId }, { status: 201 });
}
