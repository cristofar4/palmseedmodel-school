import 'server-only';
import type { NextResponse } from 'next/server';
import { fail, type ApiFailure } from '@/lib/api';
import { currentUser, principalFor, type AuthUser, type UserRole } from './session';
import type { Principal } from '@/lib/db/pool';

type Allowed = { user: AuthUser; principal: Principal };
type Denied = { response: NextResponse<ApiFailure> };

/**
 * Role checks for route handlers.
 *
 * Pages redirect when access is refused. An API call cannot redirect usefully,
 * so these return a response to send back instead.
 */
export async function requireApiRole(roles: readonly UserRole[]): Promise<Allowed | Denied> {
  const user = await currentUser();

  if (!user) {
    return { response: fail('Please sign in again.', 401) };
  }

  if (!roles.includes(user.role)) {
    // Deliberately the same wording for every refused role, so the response
    // does not describe the permission model to somebody probing it.
    return { response: fail('You do not have permission to do that.', 403) };
  }

  return { user, principal: principalFor(user) };
}

export function requireApiAdmin(): Promise<Allowed | Denied> {
  return requireApiRole(['admin']);
}

export function requireApiTeacher(): Promise<Allowed | Denied> {
  return requireApiRole(['teacher']);
}

export function requireApiStaff(): Promise<Allowed | Denied> {
  return requireApiRole(['admin', 'teacher']);
}
