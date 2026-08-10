import { PortalShell, type NavItem } from '@/components/portal/PortalShell';
import { requireAdmin } from '@/lib/auth/guards';
import { adminCounts } from '@/lib/data/admin';
import { csrfToken } from '@/lib/security/csrf';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, principal } = await requireAdmin('/admin');
  const [counts, token] = await Promise.all([adminCounts(principal), csrfToken()]);

  const nav: NavItem[] = [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/applications', label: 'Registrations', badge: counts.pending_registrations },
    { href: '/admin/students', label: 'Students' },
    { href: '/admin/teachers', label: 'Teachers' },
    { href: '/admin/academics', label: 'Academic setup' },
    { href: '/admin/announcements', label: 'Announcements' },
    { href: '/admin/email', label: 'Email' },
    { href: '/admin/security', label: 'Security and audit' },
    { href: '/admin/settings', label: 'Settings' },
  ];

  return (
    <PortalShell
      user={user}
      nav={nav}
      csrfToken={token}
      title="Administration"
      subtitle="The school record, as it actually stands. Everything shown here is read live from the database."
    >
      {children}
    </PortalShell>
  );
}
