import { requireStudent } from '@/lib/auth/guards';
import { portalAnnouncements, portalMessages } from '@/lib/data/student';
import { Panel } from '@/components/ui/Layout';
import { EmptyState } from '@/components/ui/Feedback';
import { formatDate, formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function StudentMessagesPage() {
  const { principal } = await requireStudent();

  const [announcements, messages] = await Promise.all([
    portalAnnouncements(principal, 30),
    portalMessages(principal),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <Panel
        title="Messages"
        description="Sent to you directly by the school office or a teacher."
      >
        {messages.length === 0 ? (
          <EmptyState
            title="You have no messages."
            description="Anything the school sends you personally appears here, and a copy goes to your email address."
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {messages.map((message) => (
              <li key={message.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-[1.0625rem]">{message.subject}</h3>
                  <time
                    dateTime={new Date(message.created_at).toISOString()}
                    className="text-[0.75rem] text-ink-400"
                  >
                    {formatDateTime(message.created_at)}
                  </time>
                </div>
                {message.sender_name ? (
                  <p className="mt-1 text-[0.75rem] text-ink-400">From {message.sender_name}</p>
                ) : null}
                <p className="mt-3 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink-600">
                  {message.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="School announcements" description="Notices published to the whole school.">
        {announcements.length === 0 ? (
          <EmptyState
            title="Nothing has been announced yet."
            description="School notices appear here as soon as the office publishes them."
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {announcements.map((item) => (
              <li key={item.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-3">
                  <time
                    dateTime={new Date(item.published_at).toISOString()}
                    className="text-[0.6875rem] uppercase tracking-[0.12em] text-ink-400"
                  >
                    {formatDate(item.published_at)}
                  </time>
                  {item.is_pinned ? (
                    <span className="border border-brand/30 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-brand">
                      Pinned
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 font-display text-[1.0625rem]">{item.title}</h3>
                <p className="mt-2 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink-600">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
