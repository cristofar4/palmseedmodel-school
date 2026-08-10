'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';

/**
 * Claims an account created by the school office.
 *
 * The token arrives in the link and is never shown or typed. Only the password
 * is entered here, and the account is signed in on success.
 */
export function ActivateForm({ csrfToken, token }: { csrfToken: string; token: string }) {
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
      '/api/auth/activate',
      { token, password: String(form.get('password') ?? '') },
      csrfToken,
    );

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not activate this account.');
      setFields(outcome.fields ?? {});
      setPending(false);
      return;
    }

    router.push(outcome.data?.next ?? '/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {error ? (
        <Alert tone="error" onDark>
          {error}
        </Alert>
      ) : null}

      <TextField
        label="Choose a password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
        tone="dark"
        error={fields.password}
        hint="At least 10 characters, including a number."
      />

      <Button type="submit" size="lg" loading={pending} loadingLabel="Setting your password">
        Set password and sign in
      </Button>

      <p className="text-xs leading-relaxed text-warm/40">
        Nobody at the school can see this password. If you lose it, use the reset link on the sign in
        page.
      </p>
    </form>
  );
}
