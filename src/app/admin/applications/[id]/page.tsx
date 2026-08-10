import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import { applicationById, classOptions, sessionOptions } from '@/lib/data/admin';
import { Panel, DetailRow } from '@/components/ui/Layout';
import { Alert, StatusPill } from '@/components/ui/Feedback';
import { ReviewApplication } from '@/components/admin/ReviewApplication';
import { csrfToken } from '@/lib/security/csrf';
import { formatDate, formatDateTime, statusLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { principal } = await requireAdmin();
  const { id } = await params;

  const application = await applicationById(principal, id);
  if (!application) notFound();

  const [classes, sessions, token] = await Promise.all([
    classOptions(principal),
    sessionOptions(principal),
    csrfToken(),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/applications"
          className="text-[0.8125rem] text-ink-500 underline underline-offset-4 hover:text-palm-red"
        >
          Back to registrations
        </Link>
        <StatusPill
          status={application.status === 'pending' ? 'pending_review' : application.status}
          label={application.status === 'pending' ? 'Pending Review' : statusLabel(application.status)}
        />
      </div>

      {!application.email_verified_at ? (
        <Alert tone="warning" title="This email address has not been confirmed">
          The applicant has not clicked the confirmation link yet. The address may be mistyped, so it
          is worth checking before an approval email is sent to it.
        </Alert>
      ) : null}

      <div className="grid gap-7 lg:grid-cols-2">
        <Panel title="Student">
          <dl>
            <DetailRow label="Full name" value={application.full_name} />
            <DetailRow label="Email" value={application.email} />
            <DetailRow label="Phone" value={application.phone ?? 'Not given'} />
            <DetailRow label="Date of birth" value={formatDate(application.date_of_birth)} />
            <DetailRow label="Gender" value={application.gender ?? 'Not given'} />
            <DetailRow label="Class applied for" value={application.class_applying_for} />
            <DetailRow label="Pathway" value={application.stream_preference ?? 'Not applicable'} />
            <DetailRow label="Previous school" value={application.previous_school ?? 'Not given'} />
            <DetailRow label="Home address" value={application.home_address ?? 'Not given'} />
            <DetailRow label="Submitted" value={formatDateTime(application.submitted_at)} />
          </dl>
        </Panel>

        <Panel title="Parent or guardian">
          <dl>
            <DetailRow label="Name" value={application.guardian_name} />
            <DetailRow label="Relationship" value={application.guardian_relationship} />
            <DetailRow label="Email" value={application.guardian_email} />
            <DetailRow label="Phone" value={application.guardian_phone} />
            <DetailRow label="Consent given" value="Yes, recorded at submission" />
            <DetailRow label="Portal terms accepted" value="Yes, recorded at submission" />
          </dl>
        </Panel>
      </div>

      {application.status === 'pending' ? (
        <Panel title="Decision" description="Both the student and the guardian are emailed either way.">
          <ReviewApplication
            csrfToken={token}
            applicationId={application.id}
            studentName={application.full_name}
            classes={classes}
            sessions={sessions}
            suggestedLevel={application.class_applying_for}
            suggestedStream={application.stream_preference}
          />
        </Panel>
      ) : (
        <Panel title="Decision">
          <dl>
            <DetailRow label="Outcome" value={statusLabel(application.status)} />
            <DetailRow
              label="Decided"
              value={application.reviewed_at ? formatDateTime(application.reviewed_at) : 'Not recorded'}
            />
            <DetailRow label="Note" value={application.review_note ?? 'None recorded'} />
          </dl>
        </Panel>
      )}
    </div>
  );
}
