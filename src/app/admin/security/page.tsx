import { requireAdmin } from '@/lib/auth/guards';
import { auditLogs, authActivity } from '@/lib/data/admin';
import { Panel } from '@/components/ui/Layout';
import { EmptyState } from '@/components/ui/Feedback';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { formatDateTime, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminSecurityPage() {
  const { principal } = await requireAdmin();

  const [all, failures, resets, audits] = await Promise.all([
    authActivity(principal, { limit: 60 }),
    authActivity(principal, { limit: 30, types: ['login_failed'] }),
    authActivity(principal, {
      limit: 30,
      types: ['password_reset_requested', 'password_reset_failed', 'password_changed'],
    }),
    auditLogs(principal, 60),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <Panel
        title="Authentication activity"
        description="Every sign in, sign out, account creation and confirmation, newest first."
      >
        <ActivityFeed rows={all} emptyMessage="No authentication activity has been recorded yet." />
      </Panel>

      <div className="grid gap-7 xl:grid-cols-2">
        <Panel
          title="Failed sign in attempts"
          description="Repeated failures against one account deserve a look."
        >
          <ActivityFeed rows={failures} emptyMessage="No failed attempts recorded." />
        </Panel>

        <Panel title="Password activity" description="Reset requests, failures and changes.">
          <ActivityFeed rows={resets} emptyMessage="No password activity recorded." />
        </Panel>
      </div>

      <Panel
        title="Audit log"
        description="Administrative and teaching actions that changed a record."
      >
        {audits.length === 0 ? (
          <EmptyState
            title="No administrative actions recorded yet."
            description="Approvals, status changes, account creation and exports are all written here."
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {audits.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-[0.875rem]">
                    {entry.summary ?? titleCase(entry.action)}
                  </p>
                  <p className="mt-0.5 text-[0.75rem] text-ink-400">
                    {entry.actor_name ?? 'System'}
                    {entry.actor_role ? `, ${entry.actor_role}` : ''}
                    {`, ${entry.action}`}
                  </p>
                </div>
                <time
                  dateTime={new Date(entry.created_at).toISOString()}
                  className="shrink-0 text-[0.75rem] text-ink-400"
                >
                  {formatDateTime(entry.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="text-[0.75rem] leading-relaxed text-ink-400">
        Network addresses are never stored in a readable form. Only a keyed hash is kept, which lets
        repeated activity from one origin be grouped without recording where anybody lives.
      </p>
    </div>
  );
}
