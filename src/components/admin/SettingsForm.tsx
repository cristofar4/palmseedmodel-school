'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';
import type { LoginNotificationMode } from '@/lib/settings';

const OPTIONS: Array<{ value: LoginNotificationMode; label: string; description: string }> = [
  {
    value: 'all',
    label: 'Every student sign in',
    description: 'You are emailed each time a student signs in to the portal.',
  },
  {
    value: 'suspicious_only',
    label: 'Unusual sign ins only',
    description:
      'You are emailed only when a student signs in from a device the account has not used before, or after a long period of inactivity.',
  },
  {
    value: 'off',
    label: 'No sign in notifications',
    description:
      'Nothing is emailed. Every sign in is still recorded in the activity log and the security page.',
  },
];

export function SettingsForm({
  csrfToken,
  current,
}: {
  csrfToken: string;
  current: LoginNotificationMode;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<LoginNotificationMode>(current);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    setDone(null);

    const outcome = await postJson<{ message: string }>(
      '/api/admin/settings',
      { loginNotificationMode: selected },
      csrfToken,
    );

    setPending(false);

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not save that.');
      return;
    }

    setDone(outcome.data?.message ?? 'Saved.');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}

      <fieldset className="flex flex-col gap-3 border-0 p-0">
        <legend className="sr-only">Sign in notification mode</legend>

        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer gap-3 border p-4 transition-colors ${
              selected === option.value ? 'border-brand bg-brand/[0.04]' : 'border-ink-100'
            }`}
          >
            <input
              type="radio"
              name="loginNotificationMode"
              value={option.value}
              checked={selected === option.value}
              onChange={() => setSelected(option.value)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#17604A]"
            />
            <span>
              <span className="block text-[0.9375rem] font-medium">{option.label}</span>
              <span className="mt-1 block text-[0.8125rem] leading-relaxed text-ink-500">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div>
        <Button type="submit" loading={pending} loadingLabel="Saving" disabled={selected === current}>
          Save setting
        </Button>
      </div>
    </form>
  );
}
