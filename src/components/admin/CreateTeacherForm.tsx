'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';

export function CreateTeacherForm({ csrfToken }: { csrfToken: string }) {
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

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const outcome = await postJson<{ teacherId: string }>(
      '/api/admin/teachers',
      {
        fullName: String(form.get('fullName') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: String(form.get('phone') ?? ''),
        staffNumber: String(form.get('staffNumber') ?? ''),
        qualification: String(form.get('qualification') ?? ''),
        specialism: String(form.get('specialism') ?? ''),
      },
      csrfToken,
    );

    setPending(false);

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not create that account.');
      setFields(outcome.fields ?? {});
      return;
    }

    setDone('Teaching account created. An activation email has been sent so they can set a password.');
    formElement.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Full name" name="fullName" required error={fields.fullName} />
        <TextField label="Staff number" name="staffNumber" required error={fields.staffNumber} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Email address" name="email" type="email" required error={fields.email} />
        <TextField label="Phone number" name="phone" type="tel" required error={fields.phone} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Qualification" name="qualification" error={fields.qualification} />
        <TextField
          label="Specialism"
          name="specialism"
          error={fields.specialism}
          hint="For example Mathematics, or Senior Science."
        />
      </div>

      <div>
        <Button type="submit" loading={pending} loadingLabel="Creating the account">
          Create teaching account
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-ink-400">
        No password is set here and none is sent by email. The teacher receives an activation link
        and chooses their own.
      </p>
    </form>
  );
}
