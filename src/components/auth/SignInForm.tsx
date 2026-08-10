'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';

interface SignInFormProps {
  csrfToken: string;
  /** Where to land after a successful sign in, when it is not the role home. */
  next?: string;
  tone?: 'light' | 'dark';
  onSwitchToSignup?: () => void;
}

export function SignInForm({
  csrfToken,
  next,
  tone = 'dark',
  onSwitchToSignup,
}: SignInFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    setFields({});

    const form = new FormData(event.currentTarget);
    const outcome = await postJson<{ next: string }>(
      '/api/auth/signin',
      {
        identifier: String(form.get('identifier') ?? ''),
        password: String(form.get('password') ?? ''),
      },
      csrfToken,
    );

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not sign you in.');
      setFields(outcome.fields ?? {});
      setPending(false);
      return;
    }

    // Navigation happens straight away. The transition animation is never
    // allowed to sit between the person and their dashboard.
    router.push(next ?? outcome.data?.next ?? '/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {error ? (
        <Alert tone="error" onDark={tone === 'dark'}>
          {error}
        </Alert>
      ) : null}

      <TextField
        label="Email address or admission number"
        name="identifier"
        type="text"
        autoComplete="username"
        required
        tone={tone}
        error={fields.identifier}
        placeholder="you@example.com"
      />

      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        tone={tone}
        error={fields.password}
      />

      <div className="flex items-center justify-between gap-4">
        <Link
          href="/forgot-password"
          className={`text-[0.8125rem] underline underline-offset-4 transition-colors ${
            tone === 'dark' ? 'text-warm/60 hover:text-warm' : 'text-ink-500 hover:text-ink'
          }`}
        >
          Forgot your password
        </Link>
      </div>

      <Button type="submit" size="lg" loading={pending} loadingLabel="Signing you in">
        Sign in
      </Button>

      <p className={`text-[0.8125rem] ${tone === 'dark' ? 'text-warm/55' : 'text-ink-500'}`}>
        New to Palmseed.{' '}
        {onSwitchToSignup ? (
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-medium text-brand-light underline underline-offset-4"
          >
            Create an account
          </button>
        ) : (
          <Link href="/signup" className="font-medium text-brand underline underline-offset-4">
            Create an account
          </Link>
        )}
      </p>
    </form>
  );
}
