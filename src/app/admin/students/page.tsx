import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { classOptions, students } from '@/lib/data/admin';
import { Panel } from '@/components/ui/Layout';
import { EmptyState, StatusPill } from '@/components/ui/Feedback';
import { formatDate, statusLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUSES = ['pending_review', 'active', 'suspended', 'graduated', 'rejected'] as const;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; classId?: string }>;
}) {
  const { principal } = await requireAdmin();
  const params = await searchParams;

  const query = {
    search: params.search?.trim() || undefined,
    status: STATUSES.includes(params.status as (typeof STATUSES)[number])
      ? params.status
      : undefined,
    classId: params.classId || undefined,
  };

  const [rows, classes] = await Promise.all([
    students(principal, query),
    classOptions(principal),
  ]);

  const exportQuery = new URLSearchParams();
  if (query.search) exportQuery.set('search', query.search);
  if (query.status) exportQuery.set('status', query.status);
  if (query.classId) exportQuery.set('classId', query.classId);

  return (
    <div className="flex flex-col gap-7">
      {/* Search and filter. A plain GET form, so results are linkable and the
          back button behaves. */}
      <Panel title="Find a student">
        <form method="get" className="grid gap-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="student-search"
              className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-600"
            >
              Name, email, admission number or guardian
            </label>
            <input
              id="student-search"
              name="search"
              type="search"
              defaultValue={query.search ?? ''}
              placeholder="Search the roll"
              className="w-full border border-ink-200 bg-white px-3.5 py-3 text-[0.9375rem] outline-none focus:border-brand"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="student-status"
              className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-600"
            >
              Status
            </label>
            <select
              id="student-status"
              name="status"
              defaultValue={query.status ?? ''}
              className="border border-ink-200 bg-white px-3.5 py-3 text-[0.9375rem] outline-none focus:border-brand"
            >
              <option value="">Any status</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="student-class"
              className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-600"
            >
              Class
            </label>
            <select
              id="student-class"
              name="classId"
              defaultValue={query.classId ?? ''}
              className="border border-ink-200 bg-white px-3.5 py-3 text-[0.9375rem] outline-none focus:border-brand"
            >
              <option value="">Any class</option>
              {classes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="bg-ink px-6 py-3 text-sm font-medium text-warm transition-colors hover:bg-ink-800"
          >
            Search
          </button>
        </form>
      </Panel>

      <Panel
        title={`Students, ${rows.length} shown`}
        description="Search and filters apply to the export as well."
        action={
          <a
            href={`/api/admin/students/export?${exportQuery.toString()}`}
            className="border border-ink px-4 py-2 text-[0.8125rem] font-medium text-ink transition-colors hover:bg-ink hover:text-warm"
          >
            Export CSV
          </a>
        }
        bodyClassName="p-0 sm:px-5 sm:py-5"
      >
        {rows.length === 0 ? (
          <div className="px-5 py-5 sm:p-0">
            <EmptyState
              title="No students match."
              description="Adjust the search or the filters. Nothing is hidden, this list is the whole roll."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-left">
              <caption className="sr-only">Student roll</caption>
              <thead>
                <tr className="border-b border-ink-200">
                  {['Student', 'Admission number', 'Class', 'Guardian', 'Status', 'Joined', ''].map(
                    (heading, index) => (
                      <th
                        key={heading || index}
                        scope="col"
                        className="px-3 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-400"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.user_id} className="border-b border-ink-100">
                    <th scope="row" className="px-3 py-3.5 font-normal">
                      <span className="block text-[0.9375rem]">{row.full_name}</span>
                      <span className="block text-[0.75rem] text-ink-400">{row.email}</span>
                    </th>
                    <td className="px-3 py-3.5 text-[0.8125rem] tabular-nums">
                      {row.admission_number ?? 'Not issued'}
                    </td>
                    <td className="px-3 py-3.5 text-[0.875rem]">{row.class_label ?? 'Unassigned'}</td>
                    <td className="px-3 py-3.5 text-[0.8125rem] text-ink-500">
                      {row.guardian_name ?? 'Not recorded'}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusPill status={row.status} label={statusLabel(row.status)} />
                    </td>
                    <td className="px-3 py-3.5 text-[0.8125rem] text-ink-500">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <Link
                        href={`/admin/students/${row.user_id}`}
                        className="text-[0.8125rem] font-medium text-brand underline underline-offset-4"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
