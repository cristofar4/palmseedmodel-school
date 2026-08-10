'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';

export function ProfileForm({
  csrfToken,
  phone,
  homeAddress,
  showAddress,
}: {
  csrfToken: string;
  phone: string;
  homeAddress: string;
  showAddress: boolean;
}) {
  const router = useRouter();
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

    const form = new FormData(event.currentTarget);

    const outcome = await postJson<{ message: string }>(
      '/api/portal/profile',
      {
        phone: String(form.get('phone') ?? ''),
        homeAddress: String(form.get('homeAddress') ?? ''),
      },
      csrfToken,
    );

    setPending(false);

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not save your details.');
      setFields(outcome.fields ?? {});
      return;
    }

    setDone(outcome.data?.message ?? 'Saved.');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-md flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}

      <TextField
        label="Phone number"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        defaultValue={phone}
        error={fields.phone}
      />

      {showAddress ? (
        <TextAreaField
          label="Home address"
          name="homeAddress"
          rows={3}
          defaultValue={homeAddress}
          error={fields.homeAddress}
        />
      ) : null}

      <div>
        <Button type="submit" loading={pending} loadingLabel="Saving">
          Save changes
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-ink-400">
        Your name, class, admission number and account status are school records. Contact the school
        office if any of them needs correcting.
      </p>
    </form>
  );
}
