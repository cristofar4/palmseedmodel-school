import type { Metadata } from 'next';
import { PageHeader } from '@/components/public/PageHeader';
import { EmptyState } from '@/components/ui/Feedback';
import { publicAnnouncements } from '@/lib/data/public';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'News and announcements',
  description: 'Notices published by Palmseed Model School.',
};

export const dynamic = 'force-dynamic';

export default async function NewsPage() {
  const announcements = await publicAnnouncements(50);

  return (
    <>
      <PageHeader
        eyebrow="Notice board"
        title="News and announcements."
        standfirst="Public notices from the school office. Registered families also receive these by email and in the portal."
      />

      <section className="bg-warm py-20 lg:py-28">
        <div className="shell">
          {announcements.length === 0 ? (
            <div className="max-w-2xl">
              <EmptyState
                title="No announcements have been published yet."
                description="When the school publishes its first notice it will appear here. Nothing is shown in the meantime, because an empty notice board is more honest than a filled one."
              />
            </div>
          ) : (
            <ul className="divide-y divide-ink-100 border-y border-ink-100">
              {announcements.map((item) => (
                <li key={item.id} data-vortex-item className="py-10">
                  <article className="grid gap-6 md:grid-cols-[10rem_1fr] md:gap-12">
                    <div className="flex flex-wrap items-start gap-3 md:flex-col md:gap-2">
                      <time
                        dateTime={new Date(item.published_at).toISOString()}
                        className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-400"
                      >
                        {formatDate(item.published_at)}
                      </time>
                      {item.is_pinned ? (
                        <span className="border border-palm-red/30 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-palm-red">
                          Pinned
                        </span>
                      ) : null}
                    </div>

                    <div className="max-w-[68ch]">
                      <h2 className="text-[1.375rem] leading-snug">{item.title}</h2>
                      {item.body.split(/\n{2,}/).map((paragraph, index) => (
                        <p
                          key={index}
                          className="mt-4 whitespace-pre-line text-[1rem] leading-[1.8] text-ink-600"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
