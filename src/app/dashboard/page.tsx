import Link from 'next/link';
import { requireStudent, isEnrolled } from '@/lib/auth/guards';
import { studentOverview, portalAnnouncements, studentAttendance } from '@/lib/data/student';
import { Panel, DetailRow, Stat } from '@/components/ui/Layout';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { ResendVerification } from '@/components/portal/ResendVerification';
import { csrfToken } from '@/lib/security/csrf';
import { formatDate, formatDateTime, statusLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function StudentOverviewPage() {
  const { user, principal } = await requireStudent();
  const enrolled = isEnrolled(user);

  const [overview, announcements, attendance, token] = await Promise.all([
    studentOverview(principal),
    portalAnnouncements(principal, 4),
    enrolled ? studentAttendance(principal) : Promise.resolve(null),
    csrfToken(),
  ]);

  const attendanceRate =
    attendance && attendance.total > 0
      ? `${Math.round(((attendance.present + attendance.late) / attendance.total) * 100)}%`
      : 'Not recorded';

  return (
    <div className="flex flex-col gap-7">
      {!user.emailVerifiedAt ? (
        <Alert tone="warning" title="Confirm your email address">
          <p className="mb-3">
            We sent a confirmation link to {user.email}. The school uses this address for admission
            decisions and security notices.
          </p>
          <ResendVerification csrfToken={token} />
        </Alert>
      ) : null}

      {!enrolled ? (
        <Alert tone="info" title="Your registration is being reviewed">
          The school office has your registration and will reply by email. There is nothing else you
          need to do. Your status here changes as soon as a decision is made.
        </Alert>
      ) : null}

      {/* Enrolment summary ------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Account status"
          value={statusLabel(user.status)}
          accent={user.status === 'pending_review'}
        />
        <Stat
          label="Admission number"
          value={overview?.admission_number ?? 'Not yet issued'}
          hint={overview?.admission_number ? undefined : 'Issued when a place is offered.'}
        />
        <Stat
          label="Class"
          value={overview?.class_label ?? overview?.class_applying_for ?? 'Not assigned'}
          hint={enrolled ? undefined : 'The class applied for.'}
        />
        <Stat label="Attendance" value={attendanceRate} hint={enrolled ? undefined : 'Opens after approval.'} />
      </div>

      <div className="grid gap-7 lg:grid-cols-2">
        {/* Registration and enrolment ------------------------------------- */}
        <Panel
          title={enrolled ? 'Enrolment' : 'Your registration'}
          description={
            enrolled
              ? 'As recorded by the school office.'
              : 'This is exactly what was submitted. Contact the school office if something needs correcting.'
          }
        >
          {overview ? (
            <dl>
              <DetailRow label="Full name" value={user.fullName} />
              <DetailRow label="Email" value={user.email} />
              {user.phone ? <DetailRow label="Phone" value={user.phone} /> : null}
              <DetailRow label="Date of birth" value={formatDate(overview.date_of_birth)} />
              {overview.gender ? <DetailRow label="Gender" value={overview.gender} /> : null}
              <DetailRow
                label={enrolled ? 'Class' : 'Class applied for'}
                value={overview.class_label ?? overview.class_applying_for ?? 'Not recorded'}
              />
              {overview.stream_preference ? (
                <DetailRow label="Pathway" value={overview.stream_preference} />
              ) : null}
              {overview.session_name ? (
                <DetailRow label="Session" value={overview.session_name} />
              ) : null}
              {overview.term_name ? <DetailRow label="Term" value={overview.term_name} /> : null}
              {overview.previous_school ? (
                <DetailRow label="Previous school" value={overview.previous_school} />
              ) : null}
              {overview.submitted_at ? (
                <DetailRow label="Submitted" value={formatDateTime(overview.submitted_at)} />
              ) : null}
              {overview.admitted_on ? (
                <DetailRow label="Admitted" value={formatDate(overview.admitted_on)} />
              ) : null}
            </dl>
          ) : (
            <EmptyState
              title="No registration has been submitted yet."
              description="Complete the admission details so the school office can review your registration."
              action={
                <Link
                  href="/signup/details"
                  className="bg-palm-red px-5 py-2.5 text-[0.8125rem] font-medium text-white"
                >
                  Complete the admission details
                </Link>
              }
            />
          )}

          {overview?.review_note ? (
            <div className="mt-5">
              <Alert tone="info" title="Note from the school office">
                {overview.review_note}
              </Alert>
            </div>
          ) : null}
        </Panel>

        {/* Guardian ---------------------------------------------------------- */}
        <Panel title="Parent or guardian" description="The contact the school writes to.">
          {overview?.guardian_name ? (
            <dl>
              <DetailRow label="Name" value={overview.guardian_name} />
              <DetailRow label="Relationship" value={overview.guardian_relationship ?? 'Guardian'} />
              <DetailRow label="Email" value={overview.guardian_email ?? 'Not recorded'} />
              <DetailRow label="Phone" value={overview.guardian_phone ?? 'Not recorded'} />
            </dl>
          ) : (
            <EmptyState
              title="No guardian has been recorded."
              description="A parent or guardian contact is collected with the admission details."
            />
          )}
        </Panel>
      </div>

      {/* Announcements -------------------------------------------------------- */}
      <Panel
        title="Latest announcements"
        action={
          <Link
            href="/dashboard/messages"
            className="text-[0.8125rem] text-ink-500 underline underline-offset-4 hover:text-palm-red"
          >
            All notices
          </Link>
        }
      >
        {announcements.length === 0 ? (
          <EmptyState
            title="Nothing has been announced yet."
            description="School notices appear here as soon as the office publishes them, and are emailed at the same time."
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {announcements.map((item) => (
              <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-ink-400">
                  {formatDate(item.published_at)}
                </p>
                <h3 className="mt-1.5 font-display text-[1.0625rem]">{item.title}</h3>
                <p className="mt-1.5 line-clamp-3 text-[0.875rem] leading-relaxed text-ink-500">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
