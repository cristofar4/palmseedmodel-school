import { requireUser } from '@/lib/auth/guards';
import { activeSessions, ownAuthEvents } from '@/lib/data/student';
import { Panel } from '@/components/ui/Layout';
import { EmptyState } from '@/components/ui/Feedback';
import { ChangePasswordForm } from '@/components/portal/ChangePasswordForm';
import { csrfToken } from '@/lib/security/csrf';
import { formatDateTime, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function SecurityPage() {
  const { user, principal } = await requireUser('/dashboard/security');

  const [sessions, events, token] = await Promise.all([
    activeSessions(principal),
    ownAuthEvents(principal, 15),
    csrfToken(),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <Panel title="Password" description="Choose something you do not use on any other site.">
        <ChangePasswordForm csrfToken={token} />
      </Panel>

      <Panel
        title="Signed in devices"
        description="Every device currently holding a session on this account."
      >
        {sessions.length === 0 ? (
          <EmptyState title="No active sessions." description="Nothing is signed in right now." />
        ) : (
          <ul className="divide-y divide-ink-100">
            {sessions.map((session) => (
              <li key={session.id} className="flex flex-wrap justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div>
                  <p className="text-[0.9375rem]">
                    {session.device_label ?? 'Unrecognised device'}
                    {session.id === user.sessionId ? (
                      <span className="ml-2 border border-palm-red/30 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-palm-red">
                        This device
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-[0.75rem] text-ink-400">
                    Signed in {formatDateTime(session.created_at)}
                  </p>
                </div>
                <p className="text-[0.75rem] text-ink-400">
                  Last seen {formatDateTime(session.last_seen_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-5 text-xs leading-relaxed text-ink-400">
          To sign every other device out, change your password above.
        </p>
      </Panel>

      <Panel
        title="Recent account activity"
        description="Sign ins, password changes and confirmation events on this account."
      >
        {events.length === 0 ? (
          <EmptyState title="No activity recorded yet." description="Events appear here as they happen." />
        ) : (
          <ul className="divide-y divide-ink-100">
            {events.map((event, index) => (
              <li key={`${event.created_at}-${index}`} className="flex flex-wrap justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-[0.875rem]">{titleCase(event.event_type)}</p>
                  <p className="mt-0.5 text-[0.75rem] text-ink-400">
                    {[event.browser, event.operating_system, event.device_type]
                      .filter((part) => part && part !== 'Unknown')
                      .join(', ') || 'Device not recognised'}
                    {event.ip_region ? `, ${event.ip_region}` : ''}
                  </p>
                </div>
                <time
                  dateTime={new Date(event.created_at).toISOString()}
                  className="text-[0.75rem] text-ink-400"
                >
                  {formatDateTime(event.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
