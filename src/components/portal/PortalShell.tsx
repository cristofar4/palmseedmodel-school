import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Layout';
import { StatusPill } from '@/components/ui/Feedback';
import { SignOutButton } from './SignOutButton';
import { PortalNav, type NavItem } from './PortalNav';
import { initialsOf, statusLabel } from '@/lib/format';
import type { AuthUser } from '@/lib/auth/session';

export type { NavItem };

/**
 * Chrome shared by the student, teacher and administrator portals.
 *
 * Rendered on the server. Only the navigation highlighting and the sign out
 * control need the client.
 */
export function PortalShell({
  user,
  nav,
  csrfToken,
  title,
  subtitle,
  children,
}: {
  user: AuthUser;
  nav: NavItem[];
  csrfToken: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-warm">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-warm/95 backdrop-blur-md">
        <div className="mx-auto flex h-[4.25rem] w-full max-w-[90rem] items-center justify-between gap-4 px-4 lg:px-8">
          <Link href="/" aria-label="Palmseed Model School, home">
            <Logo size={34} />
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-[0.8125rem] font-medium leading-tight text-ink">{user.fullName}</p>
              <p className="text-[0.6875rem] uppercase tracking-[0.1em] text-ink-400">
                {user.role === 'admin'
                  ? 'Administrator'
                  : user.role === 'teacher'
                    ? 'Teacher'
                    : 'Student'}
              </p>
            </div>
            <Avatar initials={initialsOf(user.fullName)} size={38} />
            <SignOutButton csrfToken={csrfToken} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[90rem] gap-8 px-4 py-8 lg:grid-cols-[15rem_1fr] lg:gap-10 lg:px-8 lg:py-10">
        <PortalNav items={nav} />

        <div className="min-w-0">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[clamp(1.5rem,3vw,2rem)] leading-tight">{title}</h1>
              {subtitle ? (
                <p className="mt-2 max-w-[62ch] text-[0.9375rem] leading-relaxed text-ink-500">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {user.role === 'student' ? (
              <StatusPill status={user.status} label={statusLabel(user.status)} />
            ) : null}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
