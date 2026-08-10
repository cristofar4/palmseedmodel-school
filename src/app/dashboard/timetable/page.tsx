import { requireStudent, isEnrolled } from '@/lib/auth/guards';
import { studentTimetable } from '@/lib/data/student';
import { Panel } from '@/components/ui/Layout';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { formatTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

export default async function StudentTimetablePage() {
  const { user, principal } = await requireStudent();

  if (!isEnrolled(user)) {
    return (
      <Alert tone="info" title="This section is not open yet">
        Your timetable appears here once the school has approved your registration and assigned a
        class.
      </Alert>
    );
  }

  const slots = await studentTimetable(principal);

  if (slots.length === 0) {
    return (
      <Panel title="Timetable">
        <EmptyState
          title="No timetable has been published for your class yet."
          description="The school sets the timetable at the start of each session. It appears here as soon as it is published."
        />
      </Panel>
    );
  }

  const byDay = DAYS.map((name, index) => ({
    name,
    slots: slots.filter((slot) => slot.day_of_week === index + 1),
  }));

  return (
    <Panel title="Timetable" description="All times are Lagos time.">
      <div className="grid gap-6 lg:grid-cols-5">
        {byDay.map((day) => (
          <section key={day.name}>
            <h2 className="border-b border-ink-200 pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-500">
              {day.name}
            </h2>

            {day.slots.length === 0 ? (
              <p className="mt-4 text-[0.8125rem] text-ink-300">No periods.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {day.slots.map((slot) => (
                  <li
                    key={`${day.name}-${slot.period_index}`}
                    className={`border px-3 py-2.5 ${
                      slot.subject_name ? 'border-ink-100 bg-white' : 'border-dashed border-ink-200'
                    }`}
                  >
                    <p className="text-[0.6875rem] tabular-nums text-ink-400">
                      {formatTime(slot.starts_at)} to {formatTime(slot.ends_at)}
                    </p>
                    <p className="mt-1 text-[0.875rem] font-medium leading-snug">
                      {slot.subject_name ?? slot.label}
                    </p>
                    {slot.teacher_name ? (
                      <p className="mt-1 text-[0.75rem] text-ink-400">{slot.teacher_name}</p>
                    ) : null}
                    {slot.room ? (
                      <p className="text-[0.75rem] text-ink-400">Room {slot.room}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </Panel>
  );
}
