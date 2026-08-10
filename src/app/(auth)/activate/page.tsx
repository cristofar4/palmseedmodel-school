import type { Metadata } from 'next';
import Link from 'next/link';
import { ActivateForm } from '@/components/auth/ActivateForm';
import { Alert } from '@/components/ui/Feedback';
import { csrfToken } from '@/lib/security/csrf';

export const metadata: Metadata = { title: 'Activate your account' };
export const dynamic = 'force-dynamic';

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = await csrfToken();

  if (!params.token) {
    return (
      <div className="mx-auto w-full max-w-[29rem]">
        <p className="eyebrow mb-4">Account activation</p>
        <h1 className="mb-7 text-[clamp(1.6rem,5vw,2.1rem)] leading-[1.15] text-warm">
          This activation link is incomplete
        </h1>
        <Alert tone="error" onDark>
          Open the link exactly as the school sent it. If it still does not work, ask the school
          office for a new one.
        </Alert>
        <div className="mt-8">
          <Link
            href="/signin"
            className="border border-warm/30 px-6 py-3.5 text-sm font-medium text-warm transition-colors hover:border-warm hover:bg-warm hover:text-ink"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[27rem]">
      <p className="eyebrow mb-4">Account activation</p>
      <h1 className="mb-3 text-[clamp(1.6rem,5vw,2.1rem)] leading-[1.15] text-warm">
        Set your password
      </h1>
      <p className="mb-8 text-[0.875rem] leading-relaxed text-warm/50">
        The school has created an account for you. Choose a password to open it. This link works
        once.
      </p>

      <ActivateForm csrfToken={token} token={params.token} />
    </div>
  );
}
