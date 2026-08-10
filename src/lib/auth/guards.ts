import 'server-only';
import { redirect } from 'next/navigation';
import { currentUser, principalFor, type AuthUser, type UserRole } from './session';
import type { Principal } from '@/lib/db/pool';

export interface Guarded {
  user: AuthUser;
  principal: Principal;
}

/**
 * The authoritative access check for every protected page.
 *
 * The middleware only looks at whether a cookie is present. This validates the
 * token against the database and confirms the account is in a state that is
 * allowed to be here.
 */
export async function requireUser(nextPath?: string): Promise<Guarded> {
  const user = await currentUser();
  if (!user) {
    const target = nextPath ? `/signin?next=${encodeURIComponent(nextPath)}` : '/signin';
    redirect(target);
  }
  return { user, principal: principalFor(user) };
}

/** Requires one of the given roles, otherwise sends the account to its own home. */
export async function requireRole(roles: readonly UserRole[], nextPath?: string): Promise<Guarded> {
  const guarded = await requireUser(nextPath);
  if (!roles.includes(guarded.user.role)) {
    redirect(homeFor(guarded.user.role));
  }
  return guarded;
}

export async function requireAdmin(nextPath?: string): Promise<Guarded> {
  return requireRole(['admin'], nextPath);
}

export async function requireTeacher(nextPath?: string): Promise<Guarded> {
  return requireRole(['teacher'], nextPath);
}

export async function requireStudent(nextPath?: string): Promise<Guarded> {
  return requireRole(['student'], nextPath);
}

/** Where an account belongs after signing in. */
export function homeFor(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'teacher':
      return '/teacher';
    default:
      return '/dashboard';
  }
}

/**
 * A student whose registration is still being reviewed may enter the portal,
 * but only the limited view. Enrolled record pages call this.
 */
export function isEnrolled(user: AuthUser): boolean {
  return user.role === 'student' && (user.status === 'active' || user.status === 'graduated');
}
