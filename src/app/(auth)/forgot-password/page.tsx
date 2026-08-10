import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { csrfToken } from '@/lib/security/csrf';

export const metadata: Metadata = { title: 'Reset your password' };
export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  const token = await csrfToken();

  return (
    <div className="mx-auto w-full max-w-[27rem]">
      <p className="eyebrow mb-4">Account recovery</p>
      <h1 className="mb-3 text-[clamp(1.6rem,5vw,2.1rem)] leading-[1.15] text-warm">
        Reset your password
      </h1>
      <p className="mb-8 text-[0.875rem] leading-relaxed text-warm/50">
        Enter the email address on the account. We send a six digit code that is valid for ten
        minutes.
      </p>

      <ForgotPasswordForm csrfToken={token} />
    </div>
  );
}
