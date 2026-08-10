'use client';

import { useId, type ReactNode } from 'react';

interface BaseFieldProps {
  /** Accepts nodes so a label can carry links, such as the portal terms. */
  label: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  /** Renders for the dark authentication surfaces. */
  tone?: 'light' | 'dark';
}

const inputBase =
  'w-full border px-3.5 py-3 text-[0.9375rem] outline-none transition-colors ' +
  'placeholder:text-ink-300 disabled:opacity-60';

const toneClasses = {
  light: 'border-ink-200 bg-white text-ink focus:border-brand',
  dark: 'border-white/18 bg-white/[0.04] text-warm placeholder:text-white/35 focus:border-brand',
} as const;

const labelTone = {
  light: 'text-ink-600',
  dark: 'text-warm/70',
} as const;

function FieldFrame({
  id,
  label,
  error,
  hint,
  required,
  tone = 'light',
  children,
}: BaseFieldProps & { id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={`text-[0.6875rem] font-semibold uppercase tracking-[0.14em] ${labelTone[tone]}`}
      >
        {label}
        {required ? (
          <span className="ml-1 text-brand" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children}

      {hint && !error ? (
        <p className={`text-xs ${tone === 'dark' ? 'text-warm/45' : 'text-ink-400'}`}>{hint}</p>
      ) : null}

      {/* Announced the moment it appears, without stealing focus. */}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-brand">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  error,
  hint,
  required,
  tone = 'light',
  className = '',
  ...rest
}: BaseFieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint} required={required} tone={tone}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        required={required}
        className={`${inputBase} ${toneClasses[tone]} ${error ? 'border-brand' : ''} ${className}`}
        {...rest}
      />
    </FieldFrame>
  );
}

export function SelectField({
  label,
  error,
  hint,
  required,
  tone = 'light',
  className = '',
  children,
  ...rest
}: BaseFieldProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint} required={required} tone={tone}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        required={required}
        className={`${inputBase} ${toneClasses[tone]} ${error ? 'border-brand' : ''} ${className}`}
        {...rest}
      >
        {children}
      </select>
    </FieldFrame>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  required,
  tone = 'light',
  className = '',
  ...rest
}: BaseFieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint} required={required} tone={tone}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        required={required}
        className={`${inputBase} ${toneClasses[tone]} ${error ? 'border-brand' : ''} ${className}`}
        {...rest}
      />
    </FieldFrame>
  );
}

export function CheckboxField({
  label,
  error,
  tone = 'light',
  ...rest
}: Omit<BaseFieldProps, 'hint'> & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#17604A]"
          {...rest}
        />
        <label
          htmlFor={id}
          className={`text-[0.8125rem] leading-relaxed ${tone === 'dark' ? 'text-warm/75' : 'text-ink-600'}`}
        >
          {label}
        </label>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-brand">
          {error}
        </p>
      ) : null}
    </div>
  );
}
