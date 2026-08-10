/**
 * Structural devices taken from the crest.
 *
 * The mark is a ring of lettering around a seed, sitting over a banner. Those
 * three shapes are the school's own geometry, so the site uses them as its
 * furniture rather than borrowing the numbered squares and plain rules that
 * every other school site has. A numbered ring instead of a numbered box, a
 * seed on the rule that divides one section from the next.
 *
 * None of this redraws the crest. These are the same shapes used separately,
 * the way a wordmark and a monogram come off one identity.
 */

/**
 * A section number inside a ring, echoing the lettered ring of the crest.
 *
 * The ring is drawn with a gap at the top where a tick of colour sits, so it
 * reads as a dial rather than as a circle with a number in it.
 */
export function RingNumber({
  value,
  size = 46,
  tone = 'dark',
  className = '',
}: {
  value: string | number;
  size?: number;
  /** dark for ink on paper, light for paper on ink. */
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const label = typeof value === 'number' ? String(value).padStart(2, '0') : value;
  const ring = tone === 'light' ? 'rgba(247,245,241,0.28)' : 'rgba(20,20,20,0.22)';
  const text = tone === 'light' ? '#F7F5F1' : '#141414';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 48 48" role="presentation">
        {/* Gap at the top, where the accent tick goes. */}
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke={ring}
          strokeWidth="1.2"
          strokeDasharray="126 12"
          strokeDashoffset="63"
          transform="rotate(-90 24 24)"
        />
        <path d="M24 1.2 L24 5.4" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" />
        <text
          x="24"
          y="24"
          textAnchor="middle"
          dominantBaseline="central"
          fill={text}
          fontFamily="var(--font-display)"
          fontSize="15"
          fontWeight="500"
          letterSpacing="0.02em"
        >
          {label}
        </text>
      </svg>
    </span>
  );
}

/**
 * The rule that separates one part of a page from the next, with the seed
 * form sitting on it. Used where a plain hairline would otherwise go.
 */
export function SeedRule({
  tone = 'dark',
  className = '',
}: {
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const line = tone === 'light' ? 'rgba(247,245,241,0.16)' : 'rgba(20,20,20,0.12)';

  return (
    <div className={`flex items-center gap-5 ${className}`} aria-hidden="true">
      <span className="h-px flex-1" style={{ background: line }} />
      <svg width="16" height="20" viewBox="0 0 16 20" role="presentation">
        {/* The seed: two mirrored curves meeting at a point, as in the crest. */}
        <path
          d="M8 1 C 14 6, 14 13, 8 19 C 2 13, 2 6, 8 1 Z"
          fill="var(--color-brand)"
          opacity="0.9"
        />
      </svg>
      <span className="h-px flex-1" style={{ background: line }} />
    </div>
  );
}

/**
 * The motto on its banner, the third shape in the crest.
 *
 * Deliberately restrained: the notched ends of the ribbon and nothing else, so
 * it can carry a short line without competing with the mark itself.
 */
export function Ribbon({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-block bg-ink px-7 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-warm ${className}`}
      style={{
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 92% 62%, 8% 62%, 0 100%)',
        paddingBottom: '1.15rem',
      }}
    >
      {children}
    </span>
  );
}
