'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useVortex } from '@/components/vortex/VortexProvider';

/** The four words the school leads with. Not claims, so they can be stated. */
const PILLARS = ['Discipline', 'Knowledge', 'Character', 'Opportunity'] as const;

/**
 * The opening statement.
 *
 * The photograph sits behind the right of this column rather than under the
 * type, so nothing here needs a scrim to stay legible and the headline can be
 * set at full contrast on the pale ground.
 *
 * Motion is one short entrance timeline, with a static presentation for anyone
 * who has asked for reduced motion.
 */
export function HeroContent({ variant = 'split' }: { variant?: 'split' | 'full' }) {
  const { open, busy } = useVortex();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const applyRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = root.querySelectorAll<HTMLElement>('[data-hero-line]');

    const context = gsap.context(() => {
      gsap.set(targets, { y: 22, autoAlpha: 0 });
      gsap.to(targets, {
        y: 0,
        autoAlpha: 1,
        duration: 0.95,
        ease: 'power3.out',
        stagger: 0.075,
        delay: 0.1,
      });
    }, root);

    return () => context.revert();
  }, []);

  const outer =
    variant === 'split'
      ? 'w-full px-6 py-20 sm:px-10 lg:py-24 lg:pl-10 lg:pr-14 xl:pl-16'
      : 'shell w-full py-16 lg:py-24';

  return (
    <div ref={rootRef} className={`relative z-10 ${outer}`}>
      <div className="max-w-[38rem]">
        <p
          data-hero-line
          className="mb-6 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.6875rem] font-semibold uppercase tracking-[0.18em]"
        >
          <span className="text-accent-deep">A brighter tomorrow</span>
          <span className="text-ink-400">starts here</span>
        </p>

        <h1
          data-hero-line
          data-vortex-item
          className="text-[clamp(2.1rem,5.2vw,3.5rem)] font-medium leading-[1.08] tracking-[-0.025em] text-ink"
        >
          Quality education for confident,
          <span className="block text-brand">compassionate leaders.</span>
        </h1>

        <p
          data-hero-line
          data-vortex-item
          className="mt-6 max-w-[46ch] text-[0.9375rem] leading-[1.85] text-ink-600"
        >
          Palmseed Model School teaches the Nigerian secondary curriculum from JSS 1 to SS 3, with
          Science, Art and Commercial pathways in the senior school. A safe, supportive place where
          every student can learn, grow and make a positive difference.
        </p>

        <div data-hero-line data-vortex-item className="mt-9 flex flex-wrap items-center gap-3.5">
          <button
            ref={applyRef}
            type="button"
            disabled={busy}
            onClick={() => open('signup', applyRef.current)}
            className="inline-flex items-center gap-2.5 rounded-full bg-brand px-7 py-3.5 text-[0.875rem] font-semibold text-white transition-colors hover:bg-brand-deep disabled:opacity-60"
          >
            Apply Now
            <svg width="13" height="9" viewBox="0 0 13 9" aria-hidden="true">
              <path
                d="M0 4.5h11M7.5 1l3.5 3.5L7.5 8"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <Link
            href="/school-life"
            className="inline-flex items-center gap-2.5 rounded-full border border-ink-200 bg-pure px-7 py-3.5 text-[0.875rem] font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
          >
            <span
              aria-hidden="true"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white"
            >
              <svg width="8" height="9" viewBox="0 0 8 9" aria-hidden="true">
                <path d="M0 0v9l8-4.5L0 0Z" fill="currentColor" />
              </svg>
            </span>
            See school life
          </Link>
        </div>

        <ul
          data-hero-line
          className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-l-2 border-accent pl-5"
        >
          {PILLARS.map((word) => (
            <li
              key={word}
              className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-500"
            >
              {word}
            </li>
          ))}
        </ul>

        <p data-hero-line className="mt-6 text-[0.75rem] leading-relaxed text-ink-400">
          Creating an account starts a registration. The school reviews each one before a place is
          offered.
        </p>
      </div>
    </div>
  );
}
