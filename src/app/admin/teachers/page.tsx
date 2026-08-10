import { requireAdmin } from '@/lib/auth/guards';
import {
  assignments,
  classOptions,
  sessionOptions,
  subjectOptions,
  teachers,
} from '@/lib/data/admin';
import { Panel } from '@/components/ui/Layout';
import { EmptyState, StatusPill } from '@/components/ui/Feedback';
import { CreateTeacherForm } from '@/components/admin/CreateTeacherForm';
import { AssignTeacherForm } from '@/components/admin/AssignTeacherForm';
import { csrfToken } from '@/lib/security/csrf';
import { formatDateTime, statusLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function TeachersPage() {
  const { principal } = await requireAdmin();
  const [rows, allAssignments, classes, subjects, sessions, token] = await Promise.all([
    teachers(principal),
    assignments(principal),
    classOptions(principal),
    subjectOptions(principal),
    sessionOptions(principal),
    csrfToken(),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <Panel
        title="Teaching staff"
        description="Teachers can only reach the classes and subjects assigned to them."
        bodyClassName="p-0 sm:px-5 sm:py-5"
      >
        {rows.length === 0 ? (
          <div className="px-5 py-5 sm:p-0">
            <EmptyState
              title="No teaching accounts yet."
              description="Create the first one below. There is no public route to a teaching account, so every one is made here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left">
              <caption className="sr-only">Teaching staff</caption>
              <thead>
                <tr className="border-b border-ink-200">
                  {['Teacher', 'Staff number', 'Specialism', 'Assignments', 'Status', 'Last sign in'].map(
                    (heading) => (
                      <th
                        key={heading}
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
                  <tr key={row.teacher_id} className="border-b border-ink-100">
                    <th scope="row" className="px-3 py-3.5 font-normal">
                      <span className="block text-[0.9375rem]">{row.full_name}</span>
                      <span className="block text-[0.75rem] text-ink-400">{row.email}</span>
                    </th>
                    <td className="px-3 py-3.5 text-[0.8125rem] tabular-nums">{row.staff_number}</td>
                    <td className="px-3 py-3.5 text-[0.875rem]">{row.specialism ?? 'Not set'}</td>
                    <td className="px-3 py-3.5 text-[0.875rem] tabular-nums">
                      {row.assignment_count}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusPill status={row.status} label={statusLabel(row.status)} />
                    </td>
                    <td className="px-3 py-3.5 text-[0.8125rem] text-ink-500">
                      {row.last_login_at ? formatDateTime(row.last_login_at) : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Assignments"
        description="A teaching account reaches nothing until it is assigned. Access follows the assignment, not the role."
      >
        {allAssignments.length === 0 ? (
          <EmptyState
            title="No assignments yet."
            description="Assign a teacher to a class below. Until then their portal shows no classes, which is correct rather than broken."
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {allAssignments.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-[0.9375rem]">{row.teacher_name}</p>
                  <p className="mt-0.5 text-[0.75rem] text-ink-400">
                    {row.class_label}
                    {row.subject_name ? `, ${row.subject_name}` : ', all subjects'}
                    {`, ${row.session_name}`}
                  </p>
                </div>
                {row.is_form_teacher ? (
                  <span className="border border-palm-red/30 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-palm-red">
                    Form teacher
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Assign a teacher to a class">
        <AssignTeacherForm
          csrfToken={token}
          teachers={rows}
          classes={classes}
          subjects={subjects}
          sessions={sessions}
        />
      </Panel>

      <Panel title="Add a teaching account">
        <CreateTeacherForm csrfToken={token} />
      </Panel>
    </div>
  );
}
