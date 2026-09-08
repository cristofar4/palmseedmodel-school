'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { useVortex } from '@/components/vortex/VortexProvider';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/academics', label: 'Academics' },
  { href: '/admissions', label: 'Admissions' },
  { href: '/school-life', label: 'School Life' },
  { href: '/news', label: 'News' },
  { href: '/contact', label: 'Contact' },
] as const;

/**
 * Sticky rather than fixed on purpose. A fixed element inside a transformed
 * ancestor is promoted to absolute by the browser, which would make the header
 * jump the instant the gravity collapse begins.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { open, busy } = useVortex();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lifted, setLifted] = useState(false);

  // The mobile menu closes when the route changes. Adjusting state during
  // render is the documented way to react to a changed value, and it avoids
  // the extra commit an effect would cause.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  const signinRef = useRef<HTMLButtonElement | null>(null);
  const signupRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      data-vortex-item
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        lifted ? 'border-ink-100 bg-pure/95 backdrop-blur-md' : 'border-transparent bg-pure'
      }`}
    >
      <div className="shell flex h-[4.5rem] items-center justify-between gap-6">
        <Link href="/" aria-label={`${'Palmseed Model School'}, home`} className="shrink-0">
          <Logo size={46} />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`relative py-1.5 text-[0.8125rem] font-medium tracking-[0.01em] transition-colors ${
                  active ? 'text-brand' : 'text-ink-600 hover:text-ink'
                }`}
              >
                {link.label}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-brand"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <button
            ref={signinRef}
            type="button"
            disabled={busy}
            onClick={() => open('signin', signinRef.current)}
            className="rounded-full border border-ink-200 px-6 py-2.5 text-[0.8125rem] font-medium text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
          >
            Login
          </button>
          <button
            ref={signupRef}
            type="button"
            disabled={busy}
            onClick={() => open('signup', signupRef.current)}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-brand-deep disabled:opacity-50"
          >
            Apply Now
            <svg width="13" height="9" viewBox="0 0 13 9" aria-hidden="true">
              <path d="M0 4.5h11M7.5 1l3.5 3.5L7.5 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          className="flex h-10 w-10 items-center justify-center lg:hidden"
        >
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
            {menuOpen ? (
              <path d="M2 2l16 10M18 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <>
                <path d="M0 1h20M0 7h20M0 13h20" stroke="currentColor" strokeWidth="1.6" />
              </>
            )}
          </svg>
        </button>
      </div>

      {menuOpen ? (
        <div id="mobile-navigation" className="border-t border-ink-100 bg-pure lg:hidden">
          <nav aria-label="Main" className="shell flex flex-col py-4">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="border-b border-ink-100 py-3.5 text-[0.9375rem] text-ink last:border-b-0"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="shell flex flex-col gap-3 pb-6">
            <button
              type="button"
              disabled={busy}
              onClick={(event) => {
                setMenuOpen(false);
                open('signin', event.currentTarget);
              }}
              className="rounded-full border border-ink-200 px-5 py-3.5 text-sm font-medium text-ink"
            >
              Login
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={(event) => {
                setMenuOpen(false);
                open('signup', event.currentTarget);
              }}
              className="rounded-full bg-brand px-5 py-3.5 text-sm font-semibold text-white"
            >
              Apply Now
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
