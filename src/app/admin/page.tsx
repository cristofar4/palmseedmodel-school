import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { adminCounts, applications, authActivity, classDistribution } from '@/lib/data/admin';
import { Panel, Stat } from '@/components/ui/Layout';
import { EmptyState, StatusPill } from '@/components/ui/Feedback';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { formatDateTime, statusLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const { principal } = await requireAdmin();

  const [counts, distribution, pending, signups, logins, failures] = await Promise.all([
    adminCounts(principal),
    classDistribution(principal),
    applications(principal, 'pending'),
    authActivity(principal, { limit: 8, types: ['signup'] }),
    authActivity(principal, { limit: 8, types: ['login_success'] }),
    authActivity(principal, { limit: 8, types: ['login_failed'] }),
  ]);

  const enrolled = distribution.reduce((sum, row) => sum + row.student_count, 0);

  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students" value={counts.total_students} hint="Every student account." />
        <Stat
          label="Pending review"
          value={counts.pending_registrations}
          accent={counts.pending_registrations > 0}
          hint={counts.pending_registrations > 0 ? 'Waiting for a decision.' : 'Nothing waiting.'}
        />
        <Stat label="Active" value={counts.active_students} hint="Enrolled and able to sign in." />
        <Stat label="Teachers" value={counts.teachers} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Suspended" value={counts.suspended_students} />
        <Stat label="Graduated" value={counts.graduated_students} />
        <Stat
          label="Failed sign ins, 24 hours"
          value={counts.failed_logins_24h}
          accent={counts.failed_logins_24h > 10}
        />
        <Stat
          label="Email failures, 7 days"
          value={counts.emails_failed_7d}
          accent={counts.emails_failed_7d > 0}
        />
      </div>

      {/* Pending registrations ---------------------------------------------- */}
      <Panel
        title="Registrations waiting for review"
        description="Every new registration lands here the moment it is submitted."
        action={
          <Link
            href="/admin/applications"
            className="text-[0.8125rem] text-ink-500 underline underline-offset-4 hover:text-brand"
          >
            Open the queue
          </Link>
        }
      >
        {pending.length === 0 ? (
          <EmptyState
            title="Nothing is waiting."
            description="New registrations appear here as soon as a family submits the admission details."
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {pending.slice(0, 6).map((application) => (
              <li key={application.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <Link
                    href={`/admin/applications/${application.id}`}
                    className="text-[0.9375rem] font-medium underline-offset-4 hover:underline"
                  >
                    {application.full_name}
                  </Link>
                  <p className="mt-0.5 text-[0.75rem] text-ink-400">
                    {application.class_applying_for}
                    {application.stream_preference ? `, ${application.stream_preference}` : ''}
                    {', '}
                    {application.email}
                  </p>
                </div>
                <p className="shrink-0 text-[0.75rem] text-ink-400">
                  {formatDateTime(application.submitted_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Class distribution --------------------------------------------------- */}
      <Panel
        title="Class distribution"
        description={
          enrolled === 0
            ? 'No students have been assigned to a class yet.'
            : `${enrolled} student${enrolled === 1 ? '' : 's'} assigned across ${distribution.length} class${distribution.length === 1 ? '' : 'es'}.`
        }
      >
        {distribution.length === 0 ? (
          <EmptyState
            title="No classes have been created yet."
            description="Create the academic session and at least one class before approving a registration."
            action={
              <Link
                href="/admin/academics"
                className="bg-brand px-5 py-2.5 text-[0.8125rem] font-medium text-white"
              >
                Open academic setup
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {distribution.map((row) => {
              const fill = row.capacity ? Math.min(100, (row.student_count / row.capacity) * 100) : 0;

              return (
                <li key={row.class_id} className="border border-ink-100 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[0.9375rem]">{row.class_label}</span>
                    <span className="text-[0.9375rem] font-medium tabular-nums">
                      {row.student_count}
                      {row.capacity ? (
                        <span className="text-ink-400"> of {row.capacity}</span>
                      ) : null}
                    </span>
                  </div>
                  {row.capacity ? (
                    <div className="mt-2.5 h-1 w-full bg-ink-100">
                      <div
                        className="h-1 bg-brand"
                        style={{ width: `${fill}%` }}
                        role="presentation"
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Activity ------------------------------------------------------------- */}
      <div className="grid gap-7 xl:grid-cols-2">
        <Panel title="Recent account creation" description="New portal accounts.">
          <ActivityFeed rows={signups} emptyMessage="No accounts have been created yet." />
        </Panel>

        <Panel title="Recent sign ins" description="Successful sign ins across all roles.">
          <ActivityFeed rows={logins} emptyMessage="No sign ins recorded yet." />
        </Panel>
      </div>

      <Panel
        title="Failed sign in attempts"
        description="Repeated failures against one account are worth looking at."
        action={
          <Link
            href="/admin/security"
            className="text-[0.8125rem] text-ink-500 underline underline-offset-4 hover:text-brand"
          >
            Full security log
          </Link>
        }
      >
        <ActivityFeed rows={failures} emptyMessage="No failed attempts recorded." />
      </Panel>

      {counts.total_students === 0 ? (
        <Panel title="Getting started">
          <ol className="flex flex-col gap-3 text-[0.9375rem] text-ink-600">
            <li>
              1. Create the academic session, its terms and at least one class under{' '}
              <Link href="/admin/academics" className="text-brand underline underline-offset-4">
                Academic setup
              </Link>
              .
            </li>
            <li>2. Add the subjects the school teaches.</li>
            <li>
              3. Create teacher accounts under{' '}
              <Link href="/admin/teachers" className="text-brand underline underline-offset-4">
                Teachers
              </Link>
              . Each one receives an activation email.
            </li>
            <li>4. Approve registrations as families submit them.</li>
          </ol>
          <p className="mt-5 text-[0.8125rem] text-ink-400">
            Nothing has been seeded. Every figure on this page is a real count, which is why they
            all read zero on a fresh installation.
          </p>
        </Panel>
      ) : null}

      <p className="text-[0.75rem] text-ink-400">
        Status legend.{' '}
        {['pending_review', 'active', 'suspended', 'graduated', 'rejected'].map((status) => (
          <span key={status} className="mr-2 inline-block align-middle">
            <StatusPill status={status} label={statusLabel(status)} />
          </span>
        ))}
      </p>
    </div>
  );
}
