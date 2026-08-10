import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import { studentByUserId } from '@/lib/data/admin';
import { authActivity } from '@/lib/data/admin';
import { Panel, DetailRow, Avatar } from '@/components/ui/Layout';
import { StatusPill } from '@/components/ui/Feedback';
import { StatusControl } from '@/components/admin/StatusControl';
import { csrfToken } from '@/lib/security/csrf';
import { formatDate, formatDateTime, initialsOf, statusLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { principal } = await requireAdmin();
  const { id } = await params;

  const student = await studentByUserId(principal, id);
  if (!student) notFound();

  const [activity, token] = await Promise.all([
    authActivity(principal, { limit: 60 }),
    csrfToken(),
  ]);

  // The feed is account wide, so it is narrowed to this student here.
  const ownActivity = activity
    .filter(
      (row) =>
        row.email_attempted === student.email.toLowerCase() ||
        row.full_name === student.full_name,
    )
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-7">
      <Link
        href="/admin/students"
        className="text-[0.8125rem] text-ink-500 underline underline-offset-4 hover:text-brand"
      >
        Back to students
      </Link>

      <Panel>
        <div className="flex flex-wrap items-center gap-5">
          <Avatar initials={initialsOf(student.full_name)} size={64} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-[1.35rem]">{student.full_name}</h2>
              <StatusPill status={student.status} label={statusLabel(student.status)} />
            </div>
            <p className="mt-1 text-[0.875rem] text-ink-500">{student.email}</p>
            <p className="mt-0.5 text-[0.75rem] text-ink-400">
              {student.admission_number ?? 'No admission number issued'}
              {student.class_label ? `, ${student.class_label}` : ''}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-7 lg:grid-cols-2">
        <Panel title="Student record">
          <dl>
            <DetailRow label="Full name" value={student.full_name} />
            <DetailRow label="Email" value={student.email} />
            <DetailRow
              label="Email confirmed"
              value={student.email_verified_at ? formatDate(student.email_verified_at) : 'Not confirmed'}
            />
            <DetailRow label="Phone" value={student.phone ?? 'Not given'} />
            <DetailRow label="Date of birth" value={formatDate(student.date_of_birth)} />
            <DetailRow label="Class" value={student.class_label ?? 'Unassigned'} />
            <DetailRow label="Admission number" value={student.admission_number ?? 'Not issued'} />
            <DetailRow
              label="Admitted on"
              value={student.admitted_on ? formatDate(student.admitted_on) : 'Not admitted'}
            />
            <DetailRow label="Previous school" value={student.previous_school ?? 'Not given'} />
            <DetailRow label="Home address" value={student.home_address ?? 'Not given'} />
            <DetailRow label="Account created" value={formatDateTime(student.created_at)} />
            <DetailRow
              label="Last sign in"
              value={student.last_login_at ? formatDateTime(student.last_login_at) : 'Never'}
            />
          </dl>
        </Panel>

        <div className="flex flex-col gap-7">
          <Panel title="Parent or guardian">
            <dl>
              <DetailRow label="Name" value={student.guardian_name ?? 'Not recorded'} />
              <DetailRow label="Email" value={student.guardian_email ?? 'Not recorded'} />
              <DetailRow label="Phone" value={student.guardian_phone ?? 'Not recorded'} />
            </dl>
          </Panel>

          <Panel title="Account status" description="Changes take effect immediately.">
            <StatusControl
              csrfToken={token}
              userId={student.user_id}
              currentStatus={student.status}
              studentName={student.full_name}
            />
          </Panel>
        </div>
      </div>

      <Panel title="Recent activity on this account">
        {ownActivity.length === 0 ? (
          <p className="text-[0.875rem] text-ink-400">No recorded activity.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {ownActivity.map((row) => (
              <li key={row.id} className="flex flex-wrap justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <span className="text-[0.875rem]">{row.event_type.replace(/_/g, ' ')}</span>
                <span className="text-[0.75rem] text-ink-400">
                  {[row.browser, row.operating_system].filter((p) => p && p !== 'Unknown').join(', ')}
                  {', '}
                  {formatDateTime(row.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
