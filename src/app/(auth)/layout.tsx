import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

/**
 * Shell for the standalone authentication pages.
 *
 * These exist alongside the vortex panel so that a direct link, a bookmark, an
 * email link or a redirect from a protected page all land somewhere real.
 */
export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-ink text-warm">
      <div className="shell flex h-20 items-center justify-between">
        <Link href="/" aria-label="Palmseed Model School, home">
          <Logo size={38} tone="light" />
        </Link>
        <Link
          href="/"
          className="text-[0.8125rem] text-warm/55 underline underline-offset-4 transition-colors hover:text-warm"
        >
          Back to the website
        </Link>
      </div>

      {/* Width is left to each page. The short forms constrain themselves to a
          single column, the admission form needs considerably more room. */}
      <main id="main" className="px-5 pb-24 pt-8 sm:pt-14">
        {children}
      </main>
    </div>
  );
}
