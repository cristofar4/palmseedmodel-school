'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';

interface SignUpFormProps {
  csrfToken: string;
  tone?: 'light' | 'dark';
  onSwitchToSignin?: () => void;
}

/**
 * Step one of registration: the account itself.
 *
 * Admission details are collected on the next screen, once the person is
 * signed in, which keeps this first form short enough to finish on a phone.
 */
export function SignUpForm({ csrfToken, tone = 'dark', onSwitchToSignin }: SignUpFormProps) {
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
      '/api/auth/signup',
      {
        fullName: String(form.get('fullName') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: String(form.get('phone') ?? ''),
        password: String(form.get('password') ?? ''),
      },
      csrfToken,
    );

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not create your account.');
      setFields(outcome.fields ?? {});
      setPending(false);
      return;
    }

    router.push(outcome.data?.next ?? '/signup/details');
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
        label="Full name of the student"
        name="fullName"
        autoComplete="name"
        required
        tone={tone}
        error={fields.fullName}
        placeholder="Adaeze Okonkwo"
      />

      <TextField
        label="Email address"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        tone={tone}
        error={fields.email}
        hint="We send the confirmation and every school notice to this address."
        placeholder="you@example.com"
      />

      <TextField
        label="Phone number"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        tone={tone}
        error={fields.phone}
        placeholder="08012345678"
      />

      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={10}
        tone={tone}
        error={fields.password}
        hint="At least 10 characters, including a number."
      />

      <Button type="submit" size="lg" loading={pending} loadingLabel="Creating your account">
        Create account
      </Button>

      <p className={`text-[0.75rem] leading-relaxed ${tone === 'dark' ? 'text-warm/45' : 'text-ink-400'}`}>
        Creating an account starts a registration. It does not enrol a student.
        The school reviews every registration before a place is offered.
      </p>

      <p className={`text-[0.8125rem] ${tone === 'dark' ? 'text-warm/55' : 'text-ink-500'}`}>
        Already registered.{' '}
        {onSwitchToSignin ? (
          <button
            type="button"
            onClick={onSwitchToSignin}
            className="font-medium text-palm-red-soft underline underline-offset-4"
          >
            Sign in
          </button>
        ) : (
          <Link href="/signin" className="font-medium text-palm-red underline underline-offset-4">
            Sign in
          </Link>
        )}
      </p>
    </form>
  );
}
