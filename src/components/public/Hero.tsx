'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useVortex } from '@/components/vortex/VortexProvider';

/**
 * The opening statement.
 *
 * The image now sits beside this column rather than behind it, so nothing here
 * needs a gradient to stay legible and the type can be set at full contrast.
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
      gsap.set(targets, { y: 24, autoAlpha: 0 });
      gsap.to(targets, {
        y: 0,
        autoAlpha: 1,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.08,
        delay: 0.1,
      });
    }, root);

    return () => context.revert();
  }, []);

  /* In the split layout this column sits against the picture, so its measure
     is narrow and it hugs the seam. Standing alone it takes the page grid and
     a wider measure, because a 34rem column adrift in a full width band reads
     as a mistake. */
  const outer =
    variant === 'split'
      ? 'w-full px-6 py-20 sm:px-10 lg:py-24 lg:pl-10 lg:pr-14 xl:pl-16'
      : 'shell w-full py-24 lg:py-32';
  const inner = variant === 'split' ? 'mx-auto max-w-[34rem] lg:mx-0 lg:ml-auto' : 'max-w-[44rem]';

  return (
    <div ref={rootRef} className={`relative z-10 ${outer}`}>
      <div className={inner}>
        <p data-hero-line className="eyebrow mb-7 text-gold">
          Nigerian Secondary Education
        </p>

        <h1
          data-hero-line
          data-vortex-item
          className={`font-medium leading-[0.99] tracking-[-0.03em] text-warm ${
            variant === 'split'
              ? 'text-[clamp(2.5rem,6.2vw,4.4rem)]'
              : 'text-[clamp(2.6rem,7vw,5.2rem)]'
          }`}
        >
          A school that takes
          <span className="block text-gold">every mind seriously.</span>
        </h1>

        <div data-hero-line className="mt-9 h-px w-16 bg-gold/50" />

        <p
          data-hero-line
          data-vortex-item
          className="mt-9 max-w-[46ch] text-[1.0625rem] leading-[1.8] text-warm/70"
        >
          Palmseed Model School teaches the Nigerian secondary curriculum from JSS 1 to SS 3, with
          Science, Art and Commercial pathways in the senior school. Careful teaching, clear
          standards, and a portal that keeps families informed.
        </p>

        <div data-hero-line data-vortex-item className="mt-11 flex flex-wrap items-center gap-4">
          <button
            ref={applyRef}
            type="button"
            disabled={busy}
            onClick={() => open('signup', applyRef.current)}
            className="bg-gold px-8 py-4 text-[0.9375rem] font-semibold text-ink transition-colors hover:bg-gold-deep hover:text-warm disabled:opacity-60"
          >
            Begin a registration
          </button>

          <a
            href="#introduction"
            className="border border-warm/25 px-8 py-4 text-[0.9375rem] font-medium text-warm transition-colors hover:border-warm hover:bg-warm hover:text-ink"
          >
            About the school
          </a>
        </div>

        <p data-hero-line className="mt-8 text-[0.8125rem] leading-relaxed text-warm/40">
          Creating an account starts a registration. The school reviews each one before a place is
          offered.
        </p>
      </div>
    </div>
  );
}
