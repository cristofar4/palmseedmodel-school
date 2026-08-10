'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';
import type { ClassStudent, ExistingAttendance } from '@/lib/data/teacher';

const STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'excused', label: 'Excused' },
] as const;

export function AttendanceGrid({
  csrfToken,
  classId,
  termId,
  date,
  roll,
  existing,
}: {
  csrfToken: string;
  classId: string;
  termId: string;
  date: string;
  roll: ClassStudent[];
  existing: ExistingAttendance[];
}) {
  const router = useRouter();

  // Anyone without a saved mark starts as present, which is the common case
  // and makes taking a register a matter of marking the exceptions.
  const [marks, setMarks] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const student of roll) {
      initial[student.profile_id] =
        existing.find((row) => row.student_profile_id === student.profile_id)?.status ?? 'present';
    }
    return initial;
  });

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const counts = STATUSES.map((status) => ({
    ...status,
    count: Object.values(marks).filter((value) => value === status.value).length,
  }));

  async function save() {
    if (pending) return;
    setPending(true);
    setError(null);
    setDone(null);

    const outcome = await postJson<{ message: string }>(
      '/api/teacher/attendance',
      {
        classId,
        termId,
        attendanceDate: date,
        entries: roll.map((student) => ({
          studentProfileId: student.profile_id,
          status: marks[student.profile_id] ?? 'present',
          note: '',
        })),
      },
      csrfToken,
    );

    setPending(false);

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not save the register.');
      return;
    }

    setDone(outcome.data?.message ?? 'Saved.');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}

      <div className="flex flex-wrap gap-4 border-b border-ink-100 pb-4">
        {counts.map((status) => (
          <p key={status.value} className="text-[0.8125rem] text-ink-500">
            <span className="font-medium tabular-nums text-ink">{status.count}</span> {status.label}
          </p>
        ))}
      </div>

      <ul className="divide-y divide-ink-100">
        {roll.map((student) => (
          <li key={student.profile_id} className="flex flex-wrap items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-[0.9375rem]">{student.full_name}</p>
              <p className="text-[0.75rem] text-ink-400">
                {student.admission_number ?? 'No admission number'}
              </p>
            </div>

            <fieldset className="flex flex-wrap gap-1.5">
              <legend className="sr-only">Attendance for {student.full_name}</legend>
              {STATUSES.map((status) => {
                const active = marks[student.profile_id] === status.value;
                return (
                  <label
                    key={status.value}
                    className={`cursor-pointer border px-3 py-1.5 text-[0.75rem] font-medium transition-colors ${
                      active
                        ? 'border-ink bg-ink text-warm'
                        : 'border-ink-200 text-ink-500 hover:border-ink'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`attendance-${student.profile_id}`}
                      value={status.value}
                      checked={active}
                      onChange={() =>
                        setMarks((previous) => ({
                          ...previous,
                          [student.profile_id]: status.value,
                        }))
                      }
                      className="sr-only"
                    />
                    {status.label}
                  </label>
                );
              })}
            </fieldset>
          </li>
        ))}
      </ul>

      <div>
        <Button onClick={save} loading={pending} loadingLabel="Saving the register">
          Save register
        </Button>
      </div>
    </div>
  );
}
