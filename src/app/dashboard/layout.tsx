import { PortalShell, type NavItem } from '@/components/portal/PortalShell';
import { requireStudent, isEnrolled } from '@/lib/auth/guards';
import { csrfToken } from '@/lib/security/csrf';

export const dynamic = 'force-dynamic';

export default async function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requireStudent('/dashboard');
  const token = await csrfToken();

  const enrolled = isEnrolled(user);

  // A student whose registration is still under review reaches the portal, but
  // the enrolled record sections stay closed and say why.
  const locked = enrolled
    ? undefined
    : 'This opens once the school has approved your registration.';

  const nav: NavItem[] = [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/records', label: 'Records', lockedReason: locked },
    { href: '/dashboard/timetable', label: 'Timetable', lockedReason: locked },
    { href: '/dashboard/assignments', label: 'Assignments', lockedReason: locked },
    { href: '/dashboard/fees', label: 'Fees', lockedReason: locked },
    { href: '/dashboard/messages', label: 'Messages and notices' },
    { href: '/dashboard/profile', label: 'Profile' },
    { href: '/dashboard/security', label: 'Security' },
  ];

  return (
    <PortalShell
      user={user}
      nav={nav}
      csrfToken={token}
      title={`Good to see you, ${user.fullName.split(' ')[0] ?? user.fullName}.`}
      subtitle={
        enrolled
          ? 'Your record as the school holds it. Everything here is entered by staff and published by the school office.'
          : 'Your account is open. The sections holding enrolled student records unlock once the school completes its review.'
      }
    >
      {children}
    </PortalShell>
  );
}
