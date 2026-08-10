import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { csrfToken } from '@/lib/security/csrf';
import { currentUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'Create an account' };
export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  const user = await currentUser();
  if (user) redirect(homeFor(user.role));

  const token = await csrfToken();

  return (
    <div className="mx-auto w-full max-w-[27rem]">
      <p className="eyebrow mb-4">Begin a registration</p>
      <h1 className="mb-3 text-[clamp(1.6rem,5vw,2.1rem)] leading-[1.15] text-warm">
        Create your Palmseed account
      </h1>
      <p className="mb-8 text-[0.875rem] leading-relaxed text-warm/50">
        This starts a registration with the school office. The admission details are collected on
        the next screen.
      </p>

      <SignUpForm csrfToken={token} tone="dark" />
    </div>
  );
}
