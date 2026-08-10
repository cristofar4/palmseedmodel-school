'use client';

import { VortexProvider } from '@/components/vortex/VortexProvider';
import { AuthPanel } from './AuthPanel';

/**
 * Client boundary for the public site.
 *
 * Only the vortex machinery and the authentication panel live on this side.
 * Everything passed in as children is rendered on the server, so the header,
 * the pages and the footer stay server components.
 */
export function PublicShell({
  csrfToken,
  children,
}: {
  csrfToken: string;
  children: React.ReactNode;
}) {
  return (
    <VortexProvider
      panel={(mode) => <AuthPanel mode={mode} csrfToken={csrfToken} />}
    >
      {children}
    </VortexProvider>
  );
}
