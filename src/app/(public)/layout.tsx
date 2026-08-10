import { PublicShell } from '@/components/public/PublicShell';
import { SiteHeader } from '@/components/public/SiteHeader';
import { SiteFooter } from '@/components/public/SiteFooter';
import { csrfToken } from '@/lib/security/csrf';

/**
 * Shell for every public page.
 *
 * The CSRF token is read here on the server and handed to the client boundary,
 * because the cookie holding it is http only and cannot be read from script.
 */
export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const token = await csrfToken();

  return (
    <PublicShell csrfToken={token}>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </PublicShell>
  );
}
