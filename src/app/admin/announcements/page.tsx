import { requireAdmin } from '@/lib/auth/guards';
import { adminAnnouncements, classOptions } from '@/lib/data/admin';
import { Panel } from '@/components/ui/Layout';
import { EmptyState } from '@/components/ui/Feedback';
import { AnnouncementForm } from '@/components/admin/AnnouncementForm';
import { csrfToken } from '@/lib/security/csrf';
import { formatDateTime, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  const { principal } = await requireAdmin();

  const [rows, classes, token] = await Promise.all([
    adminAnnouncements(principal),
    classOptions(principal),
    csrfToken(),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <Panel title="Write an announcement">
        <AnnouncementForm csrfToken={token} classes={classes} />
      </Panel>

      <Panel title="Published and drafts">
        {rows.length === 0 ? (
          <EmptyState
            title="Nothing has been written yet."
            description="A public announcement appears on the website notice board and in the portal."
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {rows.map((row) => (
              <li key={row.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-ink-200 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-ink-500">
                    {row.audience === 'class' ? (row.class_label ?? 'Class') : titleCase(row.audience)}
                  </span>
                  {row.is_pinned ? (
                    <span className="border border-palm-red/30 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-palm-red">
                      Pinned
                    </span>
                  ) : null}
                  {row.published_at ? (
                    <span className="text-[0.75rem] text-ink-400">
                      Published {formatDateTime(row.published_at)}
                    </span>
                  ) : (
                    <span className="text-[0.75rem] font-medium text-ink-500">Draft, not visible</span>
                  )}
                </div>

                <h3 className="mt-2.5 font-display text-[1.0625rem]">{row.title}</h3>
                <p className="mt-2 line-clamp-3 whitespace-pre-line text-[0.875rem] leading-relaxed text-ink-500">
                  {row.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
