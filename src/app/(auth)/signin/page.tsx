import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignInForm } from '@/components/auth/SignInForm';
import { Alert } from '@/components/ui/Feedback';
import { csrfToken } from '@/lib/security/csrf';
import { currentUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const params = await searchParams;

  // Somebody already signed in has no business on this page.
  const user = await currentUser();
  if (user) redirect(params.next ?? homeFor(user.role));

  const token = await csrfToken();

  // Only same origin paths are accepted, so this cannot be used to bounce a
  // signed in account off to another site.
  const next =
    params.next && params.next.startsWith('/') && !params.next.startsWith('//')
      ? params.next
      : undefined;

  return (
    <div className="mx-auto w-full max-w-[27rem]">
      <p className="eyebrow mb-4">Welcome back</p>
      <h1 className="mb-3 text-[clamp(1.6rem,5vw,2.1rem)] leading-[1.15] text-warm">
        Sign in to your portal
      </h1>
      <p className="mb-8 text-[0.875rem] leading-relaxed text-warm/50">
        Use the email address you registered with, or your admission number if you are an enrolled
        student.
      </p>

      {params.reset === 'done' ? (
        <div className="mb-6">
          <Alert tone="success" onDark title="Password changed">
            Sign in with your new password. Every other device has been signed out.
          </Alert>
        </div>
      ) : null}

      <SignInForm csrfToken={token} next={next} tone="dark" />
    </div>
  );
}
