'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';

export function ChangePasswordForm({ csrfToken }: { csrfToken: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    setDone(null);
    setFields({});

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const outcome = await postJson<{ message: string }>(
      '/api/auth/password/change',
      {
        currentPassword: String(form.get('currentPassword') ?? ''),
        newPassword: String(form.get('newPassword') ?? ''),
      },
      csrfToken,
    );

    setPending(false);

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not change your password.');
      setFields(outcome.fields ?? {});
      return;
    }

    setDone(outcome.data?.message ?? 'Your password has been changed.');
    formElement.reset();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-md flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}

      <TextField
        label="Current password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        error={fields.currentPassword}
      />

      <TextField
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
        error={fields.newPassword}
        hint="At least 10 characters, including a number."
      />

      <div>
        <Button type="submit" loading={pending} loadingLabel="Changing your password">
          Change password
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-ink-400">
        Changing your password signs out every other device and sends a confirmation to your email
        address.
      </p>
    </form>
  );
}
