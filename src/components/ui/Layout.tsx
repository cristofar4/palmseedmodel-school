import type { ReactNode } from 'react';

/** Eyebrow, heading and optional standfirst, used to open every section. */
export function SectionHeading({
  eyebrow,
  title,
  standfirst,
  onDark = false,
  align = 'left',
  className = '',
}: {
  eyebrow?: string;
  title: string;
  standfirst?: string;
  onDark?: boolean;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div
      className={`${align === 'center' ? 'mx-auto text-center' : ''} max-w-2xl ${className}`}
    >
      {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
      <h2
        className={`text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.12] ${
          onDark ? 'text-warm' : 'text-ink'
        }`}
      >
        {title}
      </h2>
      {standfirst ? (
        <p
          className={`mt-5 text-[1.0625rem] leading-[1.7] ${
            onDark ? 'text-warm/65' : 'text-ink-500'
          }`}
        >
          {standfirst}
        </p>
      ) : null}
    </div>
  );
}

/** A bordered content panel. The workhorse container of the dashboards. */
export function Panel({
  title,
  description,
  action,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`border border-ink-100 bg-white ${className}`}>
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div>
            <h2 className="font-display text-[1.0625rem] text-ink">{title}</h2>
            {description ? (
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-500">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={`px-5 py-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/** A single number with its label. Used across the administrator overview. */
export function Stat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="border border-ink-100 bg-white px-5 py-5">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-400">
        {label}
      </p>
      <p
        className={`mt-3 font-display text-[2rem] leading-none tabular-nums ${
          accent ? 'text-palm-red' : 'text-ink'
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-ink-400">{hint}</p> : null}
    </div>
  );
}

/** Label and value pair, used on profile and record views. */
export function DetailRow({
  label,
  value,
  onDark = false,
}: {
  label: string;
  value: ReactNode;
  onDark?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-3 last:border-b-0 ${
        onDark ? 'border-white/10' : 'border-ink-100'
      }`}
    >
      <dt
        className={`text-[0.6875rem] font-semibold uppercase tracking-[0.12em] ${
          onDark ? 'text-warm/45' : 'text-ink-400'
        }`}
      >
        {label}
      </dt>
      <dd className={`text-right text-sm ${onDark ? 'text-warm' : 'text-ink'}`}>{value}</dd>
    </div>
  );
}

/** Circular initials avatar, used until a profile photograph is uploaded. */
export function Avatar({
  initials,
  size = 48,
  tone = 'dark',
}: {
  initials: string;
  size?: number;
  tone?: 'dark' | 'red';
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold ${
        tone === 'red' ? 'bg-palm-red text-white' : 'bg-ink text-warm'
      }`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}
