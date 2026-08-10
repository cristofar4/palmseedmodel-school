import { requireTeacher } from '@/lib/auth/guards';
import { activeSessions, ownAuthEvents } from '@/lib/data/student';
import { Panel, DetailRow } from '@/components/ui/Layout';
import { EmptyState } from '@/components/ui/Feedback';
import { ChangePasswordForm } from '@/components/portal/ChangePasswordForm';
import { csrfToken } from '@/lib/security/csrf';
import { formatDate, formatDateTime, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function TeacherSecurityPage() {
  const { user, principal } = await requireTeacher();

  const [sessions, events, token] = await Promise.all([
    activeSessions(principal),
    ownAuthEvents(principal, 15),
    csrfToken(),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <Panel title="Your account">
        <dl>
          <DetailRow label="Name" value={user.fullName} />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Phone" value={user.phone ?? 'Not recorded'} />
          <DetailRow
            label="Email confirmed"
            value={user.emailVerifiedAt ? formatDate(user.emailVerifiedAt) : 'Not confirmed'}
          />
        </dl>
      </Panel>

      <Panel title="Password" description="Choose something you do not use on any other site.">
        <ChangePasswordForm csrfToken={token} />
      </Panel>

      <Panel title="Signed in devices">
        {sessions.length === 0 ? (
          <EmptyState title="No active sessions." description="Nothing is signed in right now." />
        ) : (
          <ul className="divide-y divide-ink-100">
            {sessions.map((session) => (
              <li key={session.id} className="flex flex-wrap justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <span className="text-[0.9375rem]">
                  {session.device_label ?? 'Unrecognised device'}
                  {session.id === user.sessionId ? (
                    <span className="ml-2 text-[0.75rem] text-palm-red">This device</span>
                  ) : null}
                </span>
                <span className="text-[0.75rem] text-ink-400">
                  Last seen {formatDateTime(session.last_seen_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Recent account activity">
        {events.length === 0 ? (
          <EmptyState title="No activity recorded yet." description="Events appear here as they happen." />
        ) : (
          <ul className="divide-y divide-ink-100">
            {events.map((event, index) => (
              <li
                key={`${event.created_at}-${index}`}
                className="flex flex-wrap justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="text-[0.875rem]">{titleCase(event.event_type)}</span>
                <span className="text-[0.75rem] text-ink-400">
                  {[event.browser, event.operating_system]
                    .filter((part) => part && part !== 'Unknown')
                    .join(', ')}
                  {', '}
                  {formatDateTime(event.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
