'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';
import { statusLabel } from '@/lib/format';

const STATUSES = ['pending_review', 'active', 'suspended', 'graduated', 'rejected'] as const;

export function StatusControl({
  csrfToken,
  userId,
  currentStatus,
  studentName,
}: {
  csrfToken: string;
  userId: string;
  currentStatus: string;
  studentName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [selected, setSelected] = useState(currentStatus);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    setDone(null);

    const form = new FormData(event.currentTarget);

    const outcome = await postJson<{ status: string; revokedSessions: number }>(
      '/api/admin/students/status',
      {
        userId,
        status: String(form.get('status') ?? ''),
        reason: String(form.get('reason') ?? ''),
      },
      csrfToken,
    );

    setPending(false);

    if (!outcome.ok) {
      setError(outcome.error ?? 'That did not work.');
      return;
    }

    const revoked = outcome.data?.revokedSessions ?? 0;
    setDone(
      `${studentName} is now ${statusLabel(outcome.data?.status ?? selected)}.` +
        (revoked > 0
          ? ` ${revoked} signed in device${revoked === 1 ? ' was' : 's were'} signed out.`
          : ''),
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}

      <SelectField
        label="Account status"
        name="status"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
      >
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {statusLabel(status)}
          </option>
        ))}
      </SelectField>

      <TextField
        label="Reason"
        name="reason"
        hint="Recorded in the audit log. Not sent to the student."
      />

      {selected === 'suspended' || selected === 'rejected' ? (
        <Alert tone="warning">
          This signs the account out everywhere and blocks it from signing in again.
        </Alert>
      ) : null}

      <div>
        <Button type="submit" loading={pending} loadingLabel="Saving" disabled={selected === currentStatus}>
          Update status
        </Button>
      </div>
    </form>
  );
}
