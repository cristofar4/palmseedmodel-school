import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { applications } from '@/lib/data/admin';
import { Panel } from '@/components/ui/Layout';
import { EmptyState, StatusPill } from '@/components/ui/Feedback';
import { formatDateTime, statusLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

const FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
] as const;

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { principal } = await requireAdmin();
  const params = await searchParams;

  const status =
    params.status === 'approved' || params.status === 'rejected' || params.status === 'all'
      ? params.status
      : 'pending';

  const rows = await applications(principal, status);

  return (
    <Panel
      title="Registrations"
      description="Every registration submitted through the website, newest first."
      action={
        <nav aria-label="Filter registrations" className="flex flex-wrap gap-1">
          {FILTERS.map((filter) => (
            <Link
              key={filter.value}
              href={`/admin/applications?status=${filter.value}`}
              aria-current={status === filter.value ? 'true' : undefined}
              className={`border px-3 py-1.5 text-[0.75rem] font-medium transition-colors ${
                status === filter.value
                  ? 'border-ink bg-ink text-warm'
                  : 'border-ink-200 text-ink-500 hover:border-ink'
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </nav>
      }
      bodyClassName="p-0 sm:px-5 sm:py-5"
    >
      {rows.length === 0 ? (
        <div className="px-5 py-5 sm:p-0">
          <EmptyState
            title={`No ${status === 'all' ? '' : status} registrations.`}
            description="Registrations appear here the moment a family submits the admission details on the website."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <caption className="sr-only">Registrations</caption>
            <thead>
              <tr className="border-b border-ink-200">
                {['Applicant', 'Class', 'Guardian', 'Submitted', 'Status', ''].map((heading, index) => (
                  <th
                    key={heading || index}
                    scope="col"
                    className="px-3 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-400"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-ink-100">
                  <th scope="row" className="px-3 py-3.5 font-normal">
                    <span className="block text-[0.9375rem]">{row.full_name}</span>
                    <span className="block text-[0.75rem] text-ink-400">{row.email}</span>
                  </th>
                  <td className="px-3 py-3.5 text-[0.875rem]">
                    {row.class_applying_for}
                    {row.stream_preference ? (
                      <span className="block text-[0.75rem] text-ink-400">
                        {row.stream_preference}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="block text-[0.875rem]">{row.guardian_name}</span>
                    <span className="block text-[0.75rem] text-ink-400">{row.guardian_phone}</span>
                  </td>
                  <td className="px-3 py-3.5 text-[0.8125rem] text-ink-500">
                    {formatDateTime(row.submitted_at)}
                  </td>
                  <td className="px-3 py-3.5">
                    <StatusPill
                      status={row.status === 'pending' ? 'pending_review' : row.status}
                      label={row.status === 'pending' ? 'Pending Review' : statusLabel(row.status)}
                    />
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <Link
                      href={`/admin/applications/${row.id}`}
                      className="text-[0.8125rem] font-medium text-brand underline underline-offset-4"
                    >
                      {row.status === 'pending' ? 'Review' : 'Open'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
