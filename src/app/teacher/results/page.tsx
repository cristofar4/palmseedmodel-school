import { requireTeacher } from '@/lib/auth/guards';
import { classRoll, currentPeriod, resultsForSubject, teacherAssignments } from '@/lib/data/teacher';
import { Panel } from '@/components/ui/Layout';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { ResultsGrid } from '@/components/teacher/ResultsGrid';
import { ResultsPicker } from '@/components/teacher/ResultsPicker';
import { csrfToken } from '@/lib/security/csrf';

export const dynamic = 'force-dynamic';

export default async function TeacherResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; subjectId?: string }>;
}) {
  const { principal } = await requireTeacher();
  const params = await searchParams;

  const [assignments, period, token] = await Promise.all([
    teacherAssignments(principal),
    currentPeriod(principal),
    csrfToken(),
  ]);

  // Only assignments that carry a subject can receive scores. A form teacher
  // assignment without a subject is for attendance and pastoral work.
  const teaching = assignments.filter((row) => row.subject_id !== null);

  if (teaching.length === 0) {
    return (
      <Alert tone="info" title="No subjects assigned">
        Score entry opens once the school office assigns you to a class and a subject.
      </Alert>
    );
  }

  if (!period.term_id) {
    return (
      <Alert tone="warning" title="No current term is set">
        Results are recorded against a term. Ask the school office to set the current term under
        Academic setup.
      </Alert>
    );
  }

  const selected =
    teaching.find(
      (row) => row.class_id === params.classId && row.subject_id === params.subjectId,
    ) ?? teaching[0]!;

  const [roll, existing] = await Promise.all([
    classRoll(principal, selected.class_id),
    resultsForSubject(principal, selected.class_id, selected.subject_id!, period.term_id),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <Panel title="Choose a class and subject">
        <ResultsPicker
          assignments={teaching}
          selectedClassId={selected.class_id}
          selectedSubjectId={selected.subject_id!}
        />
      </Panel>

      <Panel
        title={`${selected.class_label}, ${selected.subject_name}`}
        description={`${period.term_name}, ${period.session_name}.`}
      >
        {roll.length === 0 ? (
          <EmptyState
            title="No students in this class."
            description="Students appear here once the school office admits them and assigns them to this class."
          />
        ) : (
          <ResultsGrid
            csrfToken={token}
            classId={selected.class_id}
            subjectId={selected.subject_id!}
            termId={period.term_id}
            roll={roll}
            existing={existing}
            alreadyPublished={existing.some((row) => row.published_at !== null)}
          />
        )}
      </Panel>
    </div>
  );
}

