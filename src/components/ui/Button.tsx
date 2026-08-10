'use client';

import Link from 'next/link';
import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'onDark';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-medium tracking-[0.01em] ' +
  'transition-[background-color,color,border-color,opacity] duration-200 ' +
  'disabled:cursor-not-allowed disabled:opacity-55 select-none';

const variants: Record<Variant, string> = {
  primary: 'bg-palm-red text-white hover:bg-palm-red-deep',
  secondary: 'border border-ink text-ink hover:bg-ink hover:text-warm',
  ghost: 'text-ink hover:text-palm-red',
  danger: 'border border-palm-red text-palm-red hover:bg-palm-red hover:text-white',
  onDark: 'border border-warm/35 text-warm hover:border-warm hover:bg-warm hover:text-ink',
};

const sizes: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-[0.8125rem]',
  md: 'px-5 py-3 text-sm',
  lg: 'px-7 py-4 text-[0.9375rem]',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  loading?: boolean;
  /** Text announced and shown while loading. */
  loadingLabel?: string;
}

export type ButtonProps = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    className = '',
    loading = false,
    loadingLabel = 'Working',
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      // A control that is busy stays focusable and keeps its accessible name,
      // rather than disappearing from the tab order mid interaction.
      aria-busy={loading || undefined}
      disabled={disabled ?? loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: CommonProps & { href: string } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    'href'
  >) {
  return (
    <Link
      href={href}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
