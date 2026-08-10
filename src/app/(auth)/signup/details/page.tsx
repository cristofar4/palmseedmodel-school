import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ApplicationForm } from '@/components/auth/ApplicationForm';
import { Alert } from '@/components/ui/Feedback';
import { csrfToken } from '@/lib/security/csrf';
import { currentUser } from '@/lib/auth/session';
import { AUTHENTICATOR, withPrincipal } from '@/lib/db/pool';

export const metadata: Metadata = { title: 'Admission details' };
export const dynamic = 'force-dynamic';

export default async function ApplicationDetailsPage() {
  const user = await currentUser();
  if (!user) redirect('/signin?next=%2Fsignup%2Fdetails');
  if (user.role !== 'student') redirect('/');

  // One admission form per account. A second visit goes to the dashboard.
  const existing = await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.maybeOne<{ id: string }>('select id from applications where user_id = $1 limit 1', [user.id]),
  );
  if (existing) redirect('/dashboard');

  const token = await csrfToken();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="eyebrow mb-4">Step two of two</p>
      <h1 className="mb-3 text-[clamp(1.6rem,5vw,2.15rem)] leading-[1.15] text-warm">
        Admission details
      </h1>
      <p className="mb-8 max-w-[58ch] text-[0.875rem] leading-relaxed text-warm/50">
        Your account is created. These details go to the school office with your registration. All
        of them can be corrected later by the school if something changes.
      </p>

      {!user.emailVerifiedAt ? (
        <div className="mb-7">
          <Alert tone="warning" onDark title="Confirm your email address">
            We sent a confirmation link to {user.email}. You can finish this form first, but please
            confirm the address so the school can reach you.
          </Alert>
        </div>
      ) : null}

      <div className="border border-ink-100 bg-white p-6 sm:p-9">
        <ApplicationForm csrfToken={token} />
      </div>
    </div>
  );
}
