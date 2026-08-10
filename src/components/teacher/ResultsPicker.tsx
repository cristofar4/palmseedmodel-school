'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Assignment } from '@/lib/data/teacher';

/**
 * Chooses a class and subject pair.
 *
 * The two identifiers travel together in one option value, so an invalid
 * pairing cannot be assembled, and they are split back into query parameters
 * on navigation.
 */
export function ResultsPicker({
  assignments,
  selectedClassId,
  selectedSubjectId,
}: {
  assignments: Assignment[];
  selectedClassId: string;
  selectedSubjectId: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(`${selectedClassId}|${selectedSubjectId}`);
  const [navigating, setNavigating] = useState(false);

  function go(next: string) {
    const [classId, subjectId] = next.split('|');
    if (!classId || !subjectId) return;

    setNavigating(true);
    router.push(`/teacher/results?classId=${classId}&subjectId=${subjectId}`);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="results-target"
        className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-600"
      >
        Class and subject
      </label>

      <select
        id="results-target"
        value={value}
        disabled={navigating}
        onChange={(event) => {
          setValue(event.target.value);
          go(event.target.value);
        }}
        className="w-full border border-ink-200 bg-white px-3.5 py-3 text-[0.9375rem] outline-none focus:border-brand disabled:opacity-60 sm:max-w-md"
      >
        {assignments.map((row) => (
          <option key={row.assignment_id} value={`${row.class_id}|${row.subject_id}`}>
            {row.class_label}, {row.subject_name}
          </option>
        ))}
      </select>

      <p className="text-xs text-ink-400">
        {navigating ? 'Loading the class.' : 'The class loads as soon as you choose.'}
      </p>
    </div>
  );
}
