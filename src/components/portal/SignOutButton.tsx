'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '@/lib/client/request';

export function SignOutButton({ csrfToken }: { csrfToken: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    if (pending) return;
    setPending(true);

    await postJson('/api/auth/signout', {}, csrfToken);

    // Replace rather than push, so the back button does not return to a page
    // that is no longer readable.
    router.replace('/');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="text-[0.8125rem] text-ink-500 underline underline-offset-4 transition-colors hover:text-brand disabled:opacity-60"
    >
      {pending ? 'Signing out' : 'Sign out'}
    </button>
  );
}
