'use client';

import { useState } from 'react';
import { postJson } from '@/lib/client/request';

export function ResendVerification({ csrfToken }: { csrfToken: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    if (pending) return;
    setPending(true);

    const outcome = await postJson<{ message: string }>(
      '/api/auth/resend-verification',
      {},
      csrfToken,
    );

    setMessage(outcome.ok ? (outcome.data?.message ?? 'Sent.') : (outcome.error ?? 'Please try again.'));
    setPending(false);
  }

  if (message) {
    return <p className="text-[0.8125rem] font-medium">{message}</p>;
  }

  return (
    <button
      type="button"
      onClick={resend}
      disabled={pending}
      className="text-[0.8125rem] font-medium underline underline-offset-4 disabled:opacity-60"
    >
      {pending ? 'Sending a new link' : 'Send the confirmation link again'}
    </button>
  );
}
