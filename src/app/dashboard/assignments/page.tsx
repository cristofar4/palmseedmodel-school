import { requireStudent, isEnrolled } from '@/lib/auth/guards';
import { studentAssignments } from '@/lib/data/student';
import { Panel } from '@/components/ui/Layout';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function StudentAssignmentsPage() {
  const { user, principal } = await requireStudent();

  if (!isEnrolled(user)) {
    return (
      <Alert tone="info" title="This section is not open yet">
        Assignments appear here once the school has approved your registration and assigned a class.
      </Alert>
    );
  }

  const assignments = await studentAssignments(principal);

  return (
    <Panel title="Assignments" description="Set by your subject teachers. All times are Lagos time.">
      {assignments.length === 0 ? (
        <EmptyState
          title="No assignments have been set yet."
          description="When a teacher publishes an assignment for your class it appears here with its deadline."
        />
      ) : (
        <ul className="divide-y divide-ink-100">
          {assignments.map((item) => {
            const overdue = item.is_overdue;

            return (
              <li key={item.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-brand">
                      {item.subject_name}
                    </p>
                    <h3 className="mt-1.5 font-display text-[1.0625rem]">{item.title}</h3>
                    <p className="mt-2 max-w-prose whitespace-pre-line text-[0.875rem] leading-relaxed text-ink-500">
                      {item.instructions}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[0.6875rem] uppercase tracking-[0.1em] text-ink-400">Due</p>
                    <p
                      className={`mt-1 text-[0.8125rem] ${overdue ? 'font-medium text-brand' : 'text-ink-700'}`}
                    >
                      {formatDateTime(item.due_at)}
                    </p>
                    {item.score !== null ? (
                      <p className="mt-3 text-[0.8125rem] font-medium tabular-nums text-ink">
                        {item.score} out of {item.max_score}
                      </p>
                    ) : item.submitted_at ? (
                      <p className="mt-3 text-[0.75rem] text-ink-400">Submitted, awaiting marking</p>
                    ) : overdue ? (
                      <p className="mt-3 text-[0.75rem] font-medium text-brand">Not submitted</p>
                    ) : null}
                  </div>
                </div>

                {item.feedback ? (
                  <p className="mt-4 border-l-2 border-ink-200 pl-4 text-[0.875rem] italic leading-relaxed text-ink-600">
                    {item.feedback}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
