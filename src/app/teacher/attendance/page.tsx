import Link from 'next/link';
import { requireTeacher } from '@/lib/auth/guards';
import {
  attendanceForDate,
  classRoll,
  currentPeriod,
  teacherAssignments,
} from '@/lib/data/teacher';
import { Panel } from '@/components/ui/Layout';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { AttendanceGrid } from '@/components/teacher/AttendanceGrid';
import { csrfToken } from '@/lib/security/csrf';

export const dynamic = 'force-dynamic';

/** Today in Lagos, as a plain date string for the date input. */
function todayInLagos(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; date?: string }>;
}) {
  const { principal } = await requireTeacher();
  const params = await searchParams;

  const [assignments, period, token] = await Promise.all([
    teacherAssignments(principal),
    currentPeriod(principal),
    csrfToken(),
  ]);

  // Only classes this teacher actually holds are selectable.
  const classes = Array.from(
    new Map(assignments.map((row) => [row.class_id, row])).values(),
  );

  const selectedClassId =
    params.classId && classes.some((row) => row.class_id === params.classId)
      ? params.classId
      : classes[0]?.class_id;

  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? '') ? params.date! : todayInLagos();

  if (classes.length === 0) {
    return (
      <Alert tone="info" title="No classes assigned">
        Attendance opens once the school office assigns you to a class.
      </Alert>
    );
  }

  if (!period.term_id) {
    return (
      <Alert tone="warning" title="No current term is set">
        Attendance is recorded against a term. Ask the school office to set the current term under
        Academic setup.
      </Alert>
    );
  }

  const [roll, existing] = selectedClassId
    ? await Promise.all([
        classRoll(principal, selectedClassId),
        attendanceForDate(principal, selectedClassId, date),
      ])
    : [[], []];

  const selected = classes.find((row) => row.class_id === selectedClassId);

  return (
    <div className="flex flex-col gap-7">
      <Panel title="Choose a class and date">
        <form method="get" className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="attendance-class"
              className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-600"
            >
              Class
            </label>
            <select
              id="attendance-class"
              name="classId"
              defaultValue={selectedClassId}
              className="border border-ink-200 bg-white px-3.5 py-3 text-[0.9375rem] outline-none focus:border-brand"
            >
              {classes.map((row) => (
                <option key={row.class_id} value={row.class_id}>
                  {row.class_label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="attendance-date"
              className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-600"
            >
              Date
            </label>
            <input
              id="attendance-date"
              name="date"
              type="date"
              defaultValue={date}
              max={todayInLagos()}
              className="border border-ink-200 bg-white px-3.5 py-3 text-[0.9375rem] outline-none focus:border-brand"
            />
          </div>

          <button
            type="submit"
            className="bg-ink px-6 py-3 text-sm font-medium text-warm transition-colors hover:bg-ink-800"
          >
            Load register
          </button>
        </form>
      </Panel>

      <Panel
        title={`Register, ${selected?.class_label ?? 'class'}`}
        description={`${period.term_name}, ${date}. Anyone not marked otherwise is recorded as present.`}
        action={
          <Link
            href="/teacher"
            className="text-[0.8125rem] text-ink-500 underline underline-offset-4 hover:text-brand"
          >
            My classes
          </Link>
        }
      >
        {roll.length === 0 ? (
          <EmptyState
            title="No students in this class."
            description="Students appear here once the school office admits them and assigns them to this class."
          />
        ) : (
          <AttendanceGrid
            csrfToken={token}
            classId={selectedClassId!}
            termId={period.term_id}
            date={date}
            roll={roll}
            existing={existing}
          />
        )}
      </Panel>
    </div>
  );
}
