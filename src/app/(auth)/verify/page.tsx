import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert } from '@/components/ui/Feedback';
import { currentUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'Email confirmation' };
export const dynamic = 'force-dynamic';

type State = 'verified' | 'already' | 'expired' | 'invalid' | 'missing' | 'pending';

const COPY: Record<State, { tone: 'success' | 'warning' | 'error' | 'info'; title: string; body: string }> = {
  verified: {
    tone: 'success',
    title: 'Email address confirmed',
    body: 'Thank you. The school can now reach you at this address about your registration.',
  },
  already: {
    tone: 'info',
    title: 'This address is already confirmed',
    body: 'There is nothing more to do. You can carry on to your portal.',
  },
  expired: {
    tone: 'warning',
    title: 'That link has expired',
    body: 'Confirmation links are valid for 24 hours. Sign in and ask for a new one from your dashboard.',
  },
  invalid: {
    tone: 'error',
    title: 'That link is not valid',
    body: 'It may have been copied incompletely. Sign in and ask for a new confirmation link.',
  },
  missing: {
    tone: 'error',
    title: 'No confirmation code was supplied',
    body: 'Open the link from the email exactly as it was sent.',
  },
  pending: {
    tone: 'info',
    title: 'Check your email',
    body: 'Open the confirmation link we sent you. If it has not arrived, sign in and ask for a new one.',
  },
};

/**
 * Landing page for the email confirmation link.
 *
 * The token itself is consumed by /api/auth/verify, which redirects here with
 * the outcome. Keeping the state change in the route handler means opening
 * this page again cannot consume a second token.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  const state: State =
    params.state === 'verified' ||
    params.state === 'already' ||
    params.state === 'expired' ||
    params.state === 'invalid' ||
    params.state === 'missing'
      ? params.state
      : 'pending';

  const copy = COPY[state];
  const user = await currentUser();

  return (
    <div className="mx-auto w-full max-w-[29rem]">
      <p className="eyebrow mb-4">Email confirmation</p>
      <h1 className="mb-7 text-[clamp(1.6rem,5vw,2.1rem)] leading-[1.15] text-warm">
        {copy.title}
      </h1>

      <Alert tone={copy.tone} onDark>
        {copy.body}
      </Alert>

      <div className="mt-9 flex flex-wrap gap-4">
        {user ? (
          <Link
            href={homeFor(user.role)}
            className="bg-palm-red px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-palm-red-deep"
          >
            Go to my portal
          </Link>
        ) : (
          <Link
            href="/signin"
            className="bg-palm-red px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-palm-red-deep"
          >
            Sign in
          </Link>
        )}
        <Link
          href="/"
          className="border border-warm/30 px-6 py-3.5 text-sm font-medium text-warm transition-colors hover:border-warm hover:bg-warm hover:text-ink"
        >
          Back to the website
        </Link>
      </div>
    </div>
  );
}
