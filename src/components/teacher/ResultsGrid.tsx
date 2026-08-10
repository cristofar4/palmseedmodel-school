'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';
import type { ClassStudent, ExistingResult } from '@/lib/data/teacher';

interface Entry {
  ca: string;
  exam: string;
  remark: string;
}

/** Nine point scale, matching palmseed_grade in the database. */
function gradeFor(total: number): string {
  if (total >= 75) return 'A1';
  if (total >= 70) return 'B2';
  if (total >= 65) return 'B3';
  if (total >= 60) return 'C4';
  if (total >= 55) return 'C5';
  if (total >= 50) return 'C6';
  if (total >= 45) return 'D7';
  if (total >= 40) return 'E8';
  return 'F9';
}

export function ResultsGrid({
  csrfToken,
  classId,
  subjectId,
  termId,
  roll,
  existing,
  alreadyPublished,
}: {
  csrfToken: string;
  classId: string;
  subjectId: string;
  termId: string;
  roll: ClassStudent[];
  existing: ExistingResult[];
  alreadyPublished: boolean;
}) {
  const router = useRouter();

  const [entries, setEntries] = useState<Record<string, Entry>>(() => {
    const initial: Record<string, Entry> = {};
    for (const student of roll) {
      const row = existing.find((item) => item.student_profile_id === student.profile_id);
      initial[student.profile_id] = {
        ca: row?.ca_score ?? '',
        exam: row?.exam_score ?? '',
        remark: row?.teacher_remark ?? '',
      };
    }
    return initial;
  });

  const [pending, setPending] = useState<'save' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function update(profileId: string, field: keyof Entry, value: string) {
    setEntries((previous) => ({
      ...previous,
      [profileId]: { ...(previous[profileId] ?? { ca: '', exam: '', remark: '' }), [field]: value },
    }));
  }

  async function submit(publish: boolean) {
    if (pending) return;
    setPending(publish ? 'publish' : 'save');
    setError(null);
    setDone(null);

    const outcome = await postJson<{ message: string }>(
      '/api/teacher/results',
      {
        classId,
        subjectId,
        termId,
        publish,
        entries: roll.map((student) => {
          const entry = entries[student.profile_id] ?? { ca: '', exam: '', remark: '' };
          return {
            studentProfileId: student.profile_id,
            caScore: entry.ca === '' ? null : Number(entry.ca),
            examScore: entry.exam === '' ? null : Number(entry.exam),
            remark: entry.remark,
          };
        }),
      },
      csrfToken,
    );

    setPending(null);

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not save these results.');
      return;
    }

    setDone(outcome.data?.message ?? 'Saved.');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}

      {alreadyPublished ? (
        <Alert tone="info">
          Results for this subject and term have already been published. Any change you save here is
          visible to students straight away.
        </Alert>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <caption className="sr-only">Score entry</caption>
          <thead>
            <tr className="border-b border-ink-200">
              {['Student', 'Assessment, out of 40', 'Examination, out of 60', 'Total', 'Grade', 'Remark'].map(
                (heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-2 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-400"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {roll.map((student) => {
              const entry = entries[student.profile_id] ?? { ca: '', exam: '', remark: '' };
              const hasAny = entry.ca !== '' || entry.exam !== '';
              const total = (Number(entry.ca) || 0) + (Number(entry.exam) || 0);

              return (
                <tr key={student.profile_id} className="border-b border-ink-100">
                  <th scope="row" className="px-2 py-2.5 font-normal">
                    <span className="block text-[0.875rem]">{student.full_name}</span>
                    <span className="block text-[0.6875rem] text-ink-400">
                      {student.admission_number ?? ''}
                    </span>
                  </th>

                  <td className="px-2 py-2.5">
                    <label className="sr-only" htmlFor={`ca-${student.profile_id}`}>
                      Assessment score for {student.full_name}
                    </label>
                    <input
                      id={`ca-${student.profile_id}`}
                      type="number"
                      min={0}
                      max={40}
                      step="0.5"
                      value={entry.ca}
                      onChange={(event) => update(student.profile_id, 'ca', event.target.value)}
                      className="w-20 border border-ink-200 px-2 py-2 text-[0.875rem] tabular-nums outline-none focus:border-palm-red"
                    />
                  </td>

                  <td className="px-2 py-2.5">
                    <label className="sr-only" htmlFor={`exam-${student.profile_id}`}>
                      Examination score for {student.full_name}
                    </label>
                    <input
                      id={`exam-${student.profile_id}`}
                      type="number"
                      min={0}
                      max={60}
                      step="0.5"
                      value={entry.exam}
                      onChange={(event) => update(student.profile_id, 'exam', event.target.value)}
                      className="w-20 border border-ink-200 px-2 py-2 text-[0.875rem] tabular-nums outline-none focus:border-palm-red"
                    />
                  </td>

                  {/* Shown as a preview only. The stored value is computed by
                      the database, so these can never disagree. */}
                  <td className="px-2 py-2.5 text-[0.875rem] font-medium tabular-nums">
                    {hasAny ? total : ''}
                  </td>
                  <td className="px-2 py-2.5 text-[0.875rem] tabular-nums">
                    {hasAny ? gradeFor(total) : ''}
                  </td>

                  <td className="px-2 py-2.5">
                    <label className="sr-only" htmlFor={`remark-${student.profile_id}`}>
                      Remark for {student.full_name}
                    </label>
                    <input
                      id={`remark-${student.profile_id}`}
                      type="text"
                      maxLength={300}
                      value={entry.remark}
                      onChange={(event) => update(student.profile_id, 'remark', event.target.value)}
                      className="w-full min-w-[10rem] border border-ink-200 px-2 py-2 text-[0.875rem] outline-none focus:border-palm-red"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => submit(false)}
          loading={pending === 'save'}
          loadingLabel="Saving"
        >
          Save without publishing
        </Button>
        <Button onClick={() => submit(true)} loading={pending === 'publish'} loadingLabel="Publishing">
          Save and publish to students
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-ink-400">
        Totals and grades are calculated by the school system from the two scores you enter. Nothing
        is visible to a student until it is published.
      </p>
    </div>
  );
}
