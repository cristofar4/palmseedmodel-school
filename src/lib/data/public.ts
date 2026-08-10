import 'server-only';
import { ANONYMOUS, withPrincipal } from '@/lib/db/pool';

export interface PublicAnnouncement {
  id: string;
  title: string;
  body: string;
  published_at: Date;
  is_pinned: boolean;
}

/**
 * Announcements the school has published for everyone.
 *
 * Runs as the anonymous principal, so row level security is what decides
 * visibility rather than a predicate this function could forget to write.
 *
 * A database that is unreachable must not take the marketing site down with
 * it, so a failure here returns an empty list and the section renders its
 * empty state.
 */
export async function publicAnnouncements(limit = 4): Promise<PublicAnnouncement[]> {
  try {
    return await withPrincipal(ANONYMOUS, (tx) =>
      tx.rows<PublicAnnouncement>(
        `select id, title, body, published_at, is_pinned
           from announcements
          where audience = 'public' and published_at is not null
          order by is_pinned desc, published_at desc
          limit $1`,
        [limit],
      ),
    );
  } catch (error) {
    console.error('[public] announcements unavailable', error);
    return [];
  }
}

export interface OfferedClass {
  level: string;
  streams: string[];
}

/** The class structure the school has actually configured. */
export async function offeredClasses(): Promise<OfferedClass[]> {
  try {
    const rows = await withPrincipal(ANONYMOUS, (tx) =>
      tx.rows<{ level: string; stream: string | null }>(
        'select distinct level, stream from classes order by level',
      ),
    );

    const grouped = new Map<string, Set<string>>();
    for (const row of rows) {
      const set = grouped.get(row.level) ?? new Set<string>();
      if (row.stream) set.add(row.stream);
      grouped.set(row.level, set);
    }

    return Array.from(grouped.entries()).map(([level, streams]) => ({
      level,
      streams: Array.from(streams).sort(),
    }));
  } catch {
    return [];
  }
}
