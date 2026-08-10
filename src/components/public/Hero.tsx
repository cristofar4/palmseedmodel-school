'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useVortex } from '@/components/vortex/VortexProvider';

/**
 * The cinematic opening.
 *
 * Motion is a single entrance timeline, deliberately short and weighted, with
 * a static presentation for anyone who has asked for reduced motion. The
 * photograph and gradients are rendered by the parent so this component stays
 * client side only for the vortex triggers and the entrance.
 */
export function HeroContent() {
  const { open, busy } = useVortex();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const applyRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = root.querySelectorAll<HTMLElement>('[data-hero-line]');

    const context = gsap.context(() => {
      gsap.set(targets, { y: 26, autoAlpha: 0 });
      gsap.to(targets, {
        y: 0,
        autoAlpha: 1,
        duration: 1.05,
        ease: 'power3.out',
        stagger: 0.09,
        delay: 0.12,
      });
    }, root);

    return () => context.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative z-10 shell pb-20 pt-28 sm:pb-28 lg:pb-32 lg:pt-36">
      <p data-hero-line className="eyebrow mb-6 text-gold">
        Nigerian Secondary Education
      </p>

      <h1
        data-hero-line
        data-vortex-item
        className="max-w-[19ch] text-[clamp(2.6rem,8vw,5.25rem)] font-medium leading-[0.98] tracking-[-0.028em] text-warm"
      >
        A school that takes
        <span className="block text-gold">every mind seriously.</span>
      </h1>

      <p
        data-hero-line
        data-vortex-item
        className="mt-8 max-w-[52ch] text-[1.0625rem] leading-[1.75] text-warm/70 sm:text-[1.125rem]"
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
          className="bg-brand px-8 py-4 text-[0.9375rem] font-medium text-white transition-colors hover:bg-brand-deep disabled:opacity-60"
        >
          Begin a registration
        </button>

        <a
          href="#introduction"
          className="border border-warm/30 px-8 py-4 text-[0.9375rem] font-medium text-warm transition-colors hover:border-warm hover:bg-warm hover:text-ink"
        >
          About the school
        </a>
      </div>

      <p data-hero-line className="mt-8 text-[0.8125rem] text-warm/40">
        Creating an account starts a registration. The school reviews each one before a place is
        offered.
      </p>
    </div>
  );
}
