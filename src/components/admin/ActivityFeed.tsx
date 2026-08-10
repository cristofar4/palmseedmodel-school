import { EmptyState, StatusPill } from '@/components/ui/Feedback';
import { formatDateTime, statusLabel, titleCase } from '@/lib/format';
import type { ActivityRow } from '@/lib/data/admin';

/**
 * The authentication activity feed.
 *
 * Shows who, what, when and on which kind of device. Network addresses are
 * never displayed, and are not stored in a recoverable form to begin with.
 */
export function ActivityFeed({
  rows,
  emptyMessage,
}: {
  rows: ActivityRow[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title="Nothing recorded yet." description={emptyMessage} />;
  }

  return (
    <ul className="divide-y divide-ink-100">
      {rows.map((row) => {
        const device =
          [row.browser, row.operating_system]
            .filter((part) => part && part !== 'Unknown')
            .join(' on ') || 'Device not recognised';

        return (
          <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[0.875rem]">
                <span className="font-medium">
                  {row.full_name ?? row.email_attempted ?? 'Unknown account'}
                </span>
                {row.account_status ? (
                  <StatusPill status={row.account_status} label={statusLabel(row.account_status)} />
                ) : null}
                {row.is_new_device ? (
                  <span className="border border-brand/30 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-brand">
                    New device
                  </span>
                ) : null}
              </p>

              <p className="mt-1 text-[0.75rem] text-ink-400">
                {titleCase(row.event_type)}
                {row.admission_number ? `, ${row.admission_number}` : ''}
                {row.email_attempted && row.full_name ? `, ${row.email_attempted}` : ''}
              </p>

              <p className="mt-0.5 text-[0.75rem] text-ink-400">
                {device}
                {row.device_type && row.device_type !== 'Unknown' ? `, ${row.device_type}` : ''}
                {row.ip_region ? `, ${row.ip_region}` : ''}
              </p>
            </div>

            <time
              dateTime={new Date(row.created_at).toISOString()}
              className="shrink-0 text-[0.75rem] text-ink-400"
            >
              {formatDateTime(row.created_at)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
