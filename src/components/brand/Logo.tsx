import Image from 'next/image';
import { SCHOOL } from '@/lib/school';

interface LogoProps {
  size?: number;
  /** Renders the school name and motto beside the mark. */
  withWordmark?: boolean;
  /** Chooses the text colour when the wordmark sits on a dark surface. */
  tone?: 'dark' | 'light';
  className?: string;
}

/**
 * The single place the school mark is drawn.
 *
 * The artwork is loaded from /brand/palmseed-logo.svg and is never redrawn in
 * code, so replacing that one file updates every surface at once.
 */
export function Logo({
  size = 40,
  withWordmark = true,
  tone = 'dark',
  className = '',
}: LogoProps) {
  const nameColour = tone === 'light' ? 'text-warm' : 'text-ink';
  const mottoColour = tone === 'light' ? 'text-gold' : 'text-brand';

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Image
        src="/brand/palmseed-logo.svg"
        alt={withWordmark ? '' : SCHOOL.name}
        aria-hidden={withWordmark || undefined}
        width={size}
        height={size}
        priority
        className="shrink-0"
        style={{ width: size, height: size }}
      />
      {withWordmark ? (
        <span className="flex flex-col leading-none">
          <span
            className={`font-display text-[0.98rem] font-semibold tracking-[-0.01em] ${nameColour}`}
          >
            {SCHOOL.name}
          </span>
          <span
            className={`mt-1 text-[0.5rem] font-semibold uppercase tracking-[0.24em] ${mottoColour}`}
          >
            {SCHOOL.motto}
          </span>
        </span>
      ) : null}
    </span>
  );
}
