import { requireAdmin } from '@/lib/auth/guards';
import { classDistribution, classOptions, sessionOptions } from '@/lib/data/admin';
import { withPrincipal } from '@/lib/db/pool';
import { Panel } from '@/components/ui/Layout';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { AcademicsForms } from '@/components/admin/AcademicsForms';
import { csrfToken } from '@/lib/security/csrf';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AcademicSetupPage() {
  const { principal } = await requireAdmin();

  const [sessions, classes, distribution, subjects, terms, token] = await Promise.all([
    sessionOptions(principal),
    classOptions(principal),
    classDistribution(principal),
    withPrincipal(principal, (tx) =>
      tx.rows<{ id: string; name: string; code: string; department: string | null }>(
        'select id, name, code, department from subjects order by name',
      ),
    ),
    withPrincipal(principal, (tx) =>
      tx.rows<{ id: string; name: string; is_current: boolean; session_name: string; starts_on: Date; ends_on: Date }>(
        `select t.id, t.name, t.is_current, s.name as session_name, t.starts_on, t.ends_on
           from terms t join academic_sessions s on s.id = t.session_id
          order by t.starts_on desc`,
      ),
    ),
    csrfToken(),
  ]);

  const ready = sessions.length > 0 && classes.length > 0;

  return (
    <div className="flex flex-col gap-7">
      {!ready ? (
        <Alert tone="warning" title="Set this up before approving registrations">
          An admission number is issued against a class and an academic session. Create at least one
          of each here first.
        </Alert>
      ) : null}

      <div className="grid gap-7 xl:grid-cols-2">
        <Panel title="Academic sessions">
          {sessions.length === 0 ? (
            <EmptyState title="No sessions yet." description="Create the current school year below." />
          ) : (
            <ul className="divide-y divide-ink-100">
              {sessions.map((session) => (
                <li key={session.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="text-[0.9375rem]">{session.name}</span>
                  {session.is_current ? (
                    <span className="border border-palm-red/30 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-palm-red">
                      Current
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Terms">
          {terms.length === 0 ? (
            <EmptyState title="No terms yet." description="A term belongs to an academic session." />
          ) : (
            <ul className="divide-y divide-ink-100">
              {terms.map((term) => (
                <li key={term.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <span className="text-[0.9375rem]">{term.name}</span>
                    <span className="ml-2 text-[0.75rem] text-ink-400">{term.session_name}</span>
                  </div>
                  <span className="text-[0.75rem] text-ink-400">
                    {formatDate(term.starts_on)} to {formatDate(term.ends_on)}
                    {term.is_current ? ', current' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Classes">
          {distribution.length === 0 ? (
            <EmptyState title="No classes yet." description="Create the classes the school runs this session." />
          ) : (
            <ul className="divide-y divide-ink-100">
              {distribution.map((row) => (
                <li key={row.class_id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="text-[0.9375rem]">{row.class_label}</span>
                  <span className="text-[0.8125rem] tabular-nums text-ink-500">
                    {row.student_count} student{row.student_count === 1 ? '' : 's'}
                    {row.capacity ? ` of ${row.capacity}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Subjects">
          {subjects.length === 0 ? (
            <EmptyState title="No subjects yet." description="Add the subjects the school teaches." />
          ) : (
            <ul className="divide-y divide-ink-100">
              {subjects.map((subject) => (
                <li key={subject.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="text-[0.9375rem]">{subject.name}</span>
                  <span className="text-[0.75rem] text-ink-400">
                    {subject.code}
                    {subject.department ? `, ${subject.department}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Add to the academic structure">
        <AcademicsForms csrfToken={token} sessions={sessions} />
      </Panel>
    </div>
  );
}
