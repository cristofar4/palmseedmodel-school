import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warning' | 'error';

const alertTones: Record<Tone, string> = {
  info: 'border-ink-200 bg-white text-ink',
  success: 'border-[#1B7F4B]/30 bg-[#1B7F4B]/[0.07] text-[#12603A]',
  warning: 'border-[#B4741A]/30 bg-[#B4741A]/[0.08] text-[#8A5711]',
  error: 'border-brand/35 bg-brand/[0.07] text-brand-deep',
};

const alertTonesDark: Record<Tone, string> = {
  info: 'border-white/15 bg-white/[0.05] text-warm',
  success: 'border-[#57C98D]/30 bg-[#57C98D]/[0.1] text-[#9BE3BE]',
  warning: 'border-[#E0A64A]/30 bg-[#E0A64A]/[0.1] text-[#F0CB8C]',
  error: 'border-brand/45 bg-brand/[0.12] text-[#FFB3B8]',
};

export function Alert({
  tone = 'info',
  title,
  children,
  onDark = false,
  className = '',
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div
      // Errors interrupt, everything else waits for a pause in speech.
      role={tone === 'error' ? 'alert' : 'status'}
      className={`border px-4 py-3 text-[0.8125rem] leading-relaxed ${
        onDark ? alertTonesDark[tone] : alertTones[tone]
      } ${className}`}
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      {children}
    </div>
  );
}

/**
 * Shown wherever the school has not entered information yet. Deliberately
 * explicit that the section is empty rather than broken, because a blank panel
 * in a school portal reads as a fault.
 */
export function EmptyState({
  title,
  description,
  action,
  onDark = false,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  onDark?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-start gap-2 border border-dashed px-5 py-8 ${
        onDark ? 'border-white/15' : 'border-ink-200'
      }`}
    >
      <p className={`font-display text-base ${onDark ? 'text-warm' : 'text-ink'}`}>{title}</p>
      <p className={`max-w-prose text-[0.8125rem] leading-relaxed ${onDark ? 'text-warm/55' : 'text-ink-500'}`}>
        {description}
      </p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

const statusTones: Record<string, string> = {
  active: 'border-[#1B7F4B]/35 bg-[#1B7F4B]/10 text-[#12603A]',
  pending_review: 'border-[#B4741A]/35 bg-[#B4741A]/10 text-[#8A5711]',
  suspended: 'border-brand/40 bg-brand/10 text-brand-deep',
  rejected: 'border-ink-300 bg-ink-100 text-ink-600',
  graduated: 'border-ink-700/25 bg-ink-100 text-ink-700',
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] ${
        statusTones[status] ?? 'border-ink-200 bg-white text-ink-600'
      }`}
    >
      {label}
    </span>
  );
}
