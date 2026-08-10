'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  href: string;
  label: string;
  /** Shown as a count beside the label, for example pending registrations. */
  badge?: number;
  /** Marks an item that is not reachable yet, with the reason as a tooltip. */
  lockedReason?: string;
}

export function PortalNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Portal sections" className="lg:sticky lg:top-28 lg:self-start">
      <ul className="flex gap-1 overflow-x-auto border-b border-ink-100 pb-2 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-b-0 lg:pb-0">
        {items.map((item) => {
          // The section root should not stay highlighted on every child page,
          // so an exact match is required for it and a prefix match for others.
          const active =
            pathname === item.href ||
            (item.href.split('/').length > 2 && pathname.startsWith(`${item.href}/`));

          if (item.lockedReason) {
            return (
              <li key={item.href}>
                <span
                  title={item.lockedReason}
                  aria-disabled="true"
                  className="flex cursor-not-allowed items-center justify-between whitespace-nowrap px-3 py-2.5 text-[0.875rem] text-ink-300 lg:border-l-2 lg:border-transparent"
                >
                  {item.label}
                  <LockIcon />
                </span>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-between gap-3 whitespace-nowrap px-3 py-2.5 text-[0.875rem] transition-colors lg:border-l-2 ${
                  active
                    ? 'border-brand bg-white font-medium text-ink lg:bg-transparent'
                    : 'border-transparent text-ink-500 hover:text-ink'
                }`}
              >
                {item.label}
                {item.badge !== undefined && item.badge > 0 ? (
                  <span className="inline-flex min-w-[1.375rem] items-center justify-center bg-brand px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="13" viewBox="0 0 11 13" aria-hidden="true" className="opacity-70">
      <path
        d="M2.2 5.2V3.6a3.3 3.3 0 0 1 6.6 0v1.6M1.4 5.2h8.2v6.4H1.4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
