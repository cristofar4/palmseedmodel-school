'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';

type Stage = 'request' | 'code';

/**
 * Password recovery in two stages on one screen: ask for the code, then set a
 * new password with it. Staying on one screen means the code stays visible in
 * the email app alongside the form on a phone.
 */
export function ForgotPasswordForm({ csrfToken }: { csrfToken: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('request');
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    setFields({});

    const form = new FormData(event.currentTarget);
    const address = String(form.get('email') ?? '');

    const outcome = await postJson<{ message: string }>(
      '/api/auth/password/request',
      { email: address },
      csrfToken,
    );

    setPending(false);

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not send a code.');
      setFields(outcome.fields ?? {});
      return;
    }

    setEmail(address);
    setStage('code');
    setNotice(outcome.data?.message ?? 'If that address has an account, a code is on its way.');
  }

  async function completeReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    setFields({});

    const form = new FormData(event.currentTarget);

    const outcome = await postJson<{ next: string; message: string }>(
      '/api/auth/password/reset',
      {
        email,
        code: String(form.get('code') ?? ''),
        password: String(form.get('password') ?? ''),
      },
      csrfToken,
    );

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not change your password.');
      setFields(outcome.fields ?? {});
      setPending(false);
      return;
    }

    router.push('/signin?reset=done');
  }

  if (stage === 'request') {
    return (
      <form onSubmit={requestCode} noValidate className="flex flex-col gap-5">
        {error ? (
          <Alert tone="error" onDark>
            {error}
          </Alert>
        ) : null}

        <TextField
          label="Email address"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          tone="dark"
          error={fields.email}
          hint="We send a six digit code that expires in ten minutes."
        />

        <Button type="submit" size="lg" loading={pending} loadingLabel="Sending your code">
          Send reset code
        </Button>

        <Link
          href="/signin"
          className="text-[0.8125rem] text-warm/60 underline underline-offset-4 hover:text-warm"
        >
          Back to sign in
        </Link>
      </form>
    );
  }

  return (
    <form onSubmit={completeReset} noValidate className="flex flex-col gap-5">
      {notice ? (
        <Alert tone="success" onDark>
          {notice}
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="error" onDark>
          {error}
        </Alert>
      ) : null}

      <TextField
        label="Six digit code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        tone="dark"
        error={fields.code}
        className="tracking-[0.5em] text-center font-mono text-lg"
        placeholder="000000"
      />

      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
        tone="dark"
        error={fields.password}
        hint="At least 10 characters, including a number."
      />

      <Button type="submit" size="lg" loading={pending} loadingLabel="Changing your password">
        Set new password
      </Button>

      <button
        type="button"
        onClick={() => {
          setStage('request');
          setError(null);
          setNotice(null);
        }}
        className="text-left text-[0.8125rem] text-warm/60 underline underline-offset-4 hover:text-warm"
      >
        Use a different email address, or ask for a new code
      </button>

      <p className="text-xs leading-relaxed text-warm/40">
        Asking for a new code cancels the previous one. After five wrong attempts the code stops
        working and you will need a fresh one.
      </p>
    </form>
  );
}
