import { PortalShell, type NavItem } from '@/components/portal/PortalShell';
import { requireTeacher } from '@/lib/auth/guards';
import { csrfToken } from '@/lib/security/csrf';

export const dynamic = 'force-dynamic';

export default async function TeacherLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requireTeacher('/teacher');
  const token = await csrfToken();

  const nav: NavItem[] = [
    { href: '/teacher', label: 'My classes' },
    { href: '/teacher/attendance', label: 'Attendance' },
    { href: '/teacher/results', label: 'Results' },
    { href: '/teacher/security', label: 'Security' },
  ];

  return (
    <PortalShell
      user={user}
      nav={nav}
      csrfToken={token}
      title={`Good to see you, ${user.fullName.split(' ')[0] ?? user.fullName}.`}
      subtitle="You can reach the classes and subjects assigned to you. Everything you enter is recorded against your name."
    >
      {children}
    </PortalShell>
  );
}
