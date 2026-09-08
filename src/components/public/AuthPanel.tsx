'use client';

import { useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import type { AuthMode } from '@/components/vortex/VortexProvider';

/**
 * The authentication experience that expands out of the vortex.
 *
 * Switching between sign in and create account happens inside the panel, with
 * no second collapse. Re running the animation to swap a form would be noise.
 */
export function AuthPanel({
  mode: initialMode,
  csrfToken,
}: {
  mode: AuthMode;
  csrfToken: string;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Editorial side. Hidden on small screens where the form is the point. */}
      <aside className="relative hidden overflow-hidden border-r border-white/10 lg:block">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(105% 80% at 18% 8%, rgba(12,74,46,0.42) 0%, transparent 58%),' +
              'radial-gradient(70% 60% at 88% 92%, rgba(240,74,78,0.12) 0%, transparent 60%),' +
              'linear-gradient(172deg, #1B3126 0%, #10231A 60%, #050D09 100%)',
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Logo size={52} tone="light" />

          <div className="max-w-md">
            <p className="eyebrow mb-5">The Palmseed portal</p>
            <h2 className="text-[clamp(1.9rem,3vw,2.6rem)] leading-[1.14] text-warm">
              One record for every student, kept accurate and kept private.
            </h2>
            <p className="mt-6 text-[0.9375rem] leading-[1.75] text-warm/55">
              Results, attendance, assignments and school notices in one place. Students see their
              own record and nobody else’s. Guardians are told when something changes.
            </p>
          </div>

          <p className="text-[0.6875rem] uppercase tracking-[0.2em] text-warm/30">
            Always Useful
          </p>
        </div>
      </aside>

      <div className="flex items-center justify-center px-5 py-16 sm:px-10 lg:py-20">
        <div className="w-full max-w-[26rem]">
          <div className="mb-9 lg:hidden">
            <Logo size={48} tone="light" />
          </div>

          <p className="eyebrow mb-4">
            {mode === 'signin' ? 'Welcome back' : 'Begin a registration'}
          </p>
          <h1 className="mb-3 text-[clamp(1.6rem,4vw,2.1rem)] leading-[1.15] text-warm">
            {mode === 'signin' ? 'Sign in to your portal' : 'Create your Palmseed account'}
          </h1>
          <p className="mb-9 text-[0.875rem] leading-relaxed text-warm/50">
            {mode === 'signin'
              ? 'Use the email address you registered with, or your admission number if you are an enrolled student.'
              : 'This starts a registration with the school office. It takes about two minutes.'}
          </p>

          {mode === 'signin' ? (
            <SignInForm
              csrfToken={csrfToken}
              tone="dark"
              onSwitchToSignup={() => setMode('signup')}
            />
          ) : (
            <SignUpForm
              csrfToken={csrfToken}
              tone="dark"
              onSwitchToSignin={() => setMode('signin')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
