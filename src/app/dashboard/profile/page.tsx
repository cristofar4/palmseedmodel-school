import { requireStudent } from '@/lib/auth/guards';
import { studentOverview } from '@/lib/data/student';
import { Panel, DetailRow, Avatar } from '@/components/ui/Layout';
import { ProfileForm } from '@/components/portal/ProfileForm';
import { csrfToken } from '@/lib/security/csrf';
import { formatDate, initialsOf, statusLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function StudentProfilePage() {
  const { user, principal } = await requireStudent();
  const [overview, token] = await Promise.all([studentOverview(principal), csrfToken()]);

  return (
    <div className="flex flex-col gap-7">
      <Panel title="Your profile">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar initials={initialsOf(user.fullName)} size={68} />
          <div>
            <p className="font-display text-[1.25rem]">{user.fullName}</p>
            <p className="mt-1 text-[0.875rem] text-ink-500">{user.email}</p>
            <p className="mt-1 text-[0.75rem] uppercase tracking-[0.1em] text-ink-400">
              {statusLabel(user.status)}
              {overview?.admission_number ? `, ${overview.admission_number}` : ''}
            </p>
          </div>
        </div>

        <dl className="mt-8">
          <DetailRow label="Full name" value={user.fullName} />
          <DetailRow label="Email address" value={user.email} />
          <DetailRow
            label="Email confirmed"
            value={user.emailVerifiedAt ? formatDate(user.emailVerifiedAt) : 'Not yet confirmed'}
          />
          <DetailRow label="Date of birth" value={formatDate(overview?.date_of_birth)} />
          <DetailRow
            label="Class"
            value={overview?.class_label ?? overview?.class_applying_for ?? 'Not assigned'}
          />
          <DetailRow label="Admission number" value={overview?.admission_number ?? 'Not yet issued'} />
          <DetailRow label="Session" value={overview?.session_name ?? 'Not set'} />
        </dl>
      </Panel>

      <Panel
        title="Contact details"
        description="These are the details you can change yourself."
      >
        <ProfileForm
          csrfToken={token}
          phone={user.phone ?? ''}
          homeAddress={overview?.home_address ?? ''}
          showAddress
        />
      </Panel>

      {overview?.guardian_name ? (
        <Panel
          title="Parent or guardian"
          description="Recorded by the school. Contact the office to change it."
        >
          <dl>
            <DetailRow label="Name" value={overview.guardian_name} />
            <DetailRow label="Relationship" value={overview.guardian_relationship ?? 'Guardian'} />
            <DetailRow label="Email" value={overview.guardian_email ?? 'Not recorded'} />
            <DetailRow label="Phone" value={overview.guardian_phone ?? 'Not recorded'} />
          </dl>
        </Panel>
      ) : null}
    </div>
  );
}
