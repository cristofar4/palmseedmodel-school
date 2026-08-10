import Link from 'next/link';
import { requireTeacher } from '@/lib/auth/guards';
import { currentPeriod, teacherAssignments } from '@/lib/data/teacher';
import { portalAnnouncements } from '@/lib/data/student';
import { Panel, Stat, DetailRow } from '@/components/ui/Layout';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function TeacherOverviewPage() {
  const { principal } = await requireTeacher();

  const [assignments, period, announcements] = await Promise.all([
    teacherAssignments(principal),
    currentPeriod(principal),
    portalAnnouncements(principal, 5),
  ]);

  const classes = new Set(assignments.map((row) => row.class_id));
  const subjects = new Set(assignments.filter((row) => row.subject_id).map((row) => row.subject_id));
  const formClasses = assignments.filter((row) => row.is_form_teacher);

  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Classes" value={classes.size} />
        <Stat label="Subjects" value={subjects.size} />
        <Stat label="Form classes" value={formClasses.length} />
        <Stat label="Current term" value={period.term_name ?? 'Not set'} />
      </div>

      {assignments.length === 0 ? (
        <Alert tone="info" title="You have not been assigned to a class yet">
          Class and subject assignments are made by the school office. Once they are in place your
          classes appear here and the attendance and results pages open.
        </Alert>
      ) : null}

      <Panel title="Assigned classes and subjects">
        {assignments.length === 0 ? (
          <EmptyState
            title="No assignments."
            description="Nothing has been assigned to this account for the current session."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {assignments.map((row) => (
              <li key={row.assignment_id} className="border border-ink-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-[1.0625rem]">{row.class_label}</p>
                    <p className="mt-1 text-[0.875rem] text-ink-500">
                      {row.subject_name ?? 'Form teacher, all subjects'}
                    </p>
                  </div>
                  {row.is_form_teacher ? (
                    <span className="border border-palm-red/30 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-palm-red">
                      Form
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 text-[0.75rem] text-ink-400">
                  {row.student_count} student{row.student_count === 1 ? '' : 's'}, {row.session_name}
                </p>

                <div className="mt-4 flex flex-wrap gap-4">
                  <Link
                    href={`/teacher/attendance?classId=${row.class_id}`}
                    className="text-[0.8125rem] font-medium text-palm-red underline underline-offset-4"
                  >
                    Take attendance
                  </Link>
                  {row.subject_id ? (
                    <Link
                      href={`/teacher/results?classId=${row.class_id}&subjectId=${row.subject_id}`}
                      className="text-[0.8125rem] font-medium text-palm-red underline underline-offset-4"
                    >
                      Enter results
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Current period">
        <dl>
          <DetailRow label="Session" value={period.session_name ?? 'Not set by the school'} />
          <DetailRow label="Term" value={period.term_name ?? 'Not set by the school'} />
        </dl>
      </Panel>

      <Panel title="Announcements">
        {announcements.length === 0 ? (
          <EmptyState title="Nothing announced." description="Staff notices appear here." />
        ) : (
          <ul className="divide-y divide-ink-100">
            {announcements.map((item) => (
              <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-ink-400">
                  {formatDate(item.published_at)}
                </p>
                <h3 className="mt-1.5 font-display text-[1.0625rem]">{item.title}</h3>
                <p className="mt-1.5 whitespace-pre-line text-[0.875rem] leading-relaxed text-ink-500">
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
