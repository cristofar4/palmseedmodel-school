import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { AUTHENTICATOR, withPrincipal, type Principal } from '@/lib/db/pool';
import { hashToken, randomToken } from '@/lib/security/tokens';
import type { RequestContext } from '@/lib/security/request-context';

export const SESSION_COOKIE = 'palmseed_session';
const SESSION_DAYS = 7;

export type UserRole = 'student' | 'teacher' | 'admin';
export type AccountStatus =
  | 'pending_review'
  | 'active'
  | 'suspended'
  | 'graduated'
  | 'rejected';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  status: AccountStatus;
  emailVerifiedAt: Date | null;
  mustChangePassword: boolean;
  sessionId: string;
}

interface SessionRow {
  session_id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  status: AccountStatus;
  email_verified_at: Date | null;
  must_change_password: boolean;
}

/**
 * Issues a new server side session and plants the cookie.
 *
 * Only the SHA-256 digest of the token is stored, so the database never holds
 * a value that could be replayed as a session.
 */
export async function createSession(
  userId: string,
  context: Pick<RequestContext, 'ipHash' | 'userAgent' | 'deviceLabel'>,
): Promise<string> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.exec(
      `insert into auth_sessions (user_id, token_hash, expires_at, user_agent, ip_hash, device_label)
       values ($1, $2, $3, $4, $5, $6)`,
      [userId, hashToken(token), expiresAt, context.userAgent, context.ipHash, context.deviceLabel],
    ),
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });

  return token;
}

/**
 * Resolves the signed in account for the current request.
 *
 * Wrapped in React cache so that a layout, a page and several components can
 * all ask for the current user and only one database round trip happens.
 */
export const currentUser = cache(async (): Promise<AuthUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.maybeOne<SessionRow>(
      `
      select s.id as session_id,
             u.id as user_id,
             u.email,
             u.full_name,
             u.phone,
             u.role,
             u.status,
             u.email_verified_at,
             u.must_change_password
      from auth_sessions s
      join users u on u.id = s.user_id
      where s.token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()
      `,
      [hashToken(token)],
    ),
  );

  if (!row) return null;

  // A suspended or rejected account keeps its cookie but loses its principal.
  if (row.status === 'suspended' || row.status === 'rejected') return null;

  return {
    id: row.user_id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    status: row.status,
    emailVerifiedAt: row.email_verified_at,
    mustChangePassword: row.must_change_password,
    sessionId: row.session_id,
  };
});

/** The database principal matching the signed in account. */
export function principalFor(user: AuthUser): Principal {
  return { kind: 'user', userId: user.id, role: user.role };
}

/** Marks the current session revoked and clears the cookie. */
export async function destroyCurrentSession(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await withPrincipal(AUTHENTICATOR, (tx) =>
      tx.exec('update auth_sessions set revoked_at = now() where token_hash = $1', [
        hashToken(token),
      ]),
    );
  }

  store.delete(SESSION_COOKIE);
  return token ?? null;
}

/**
 * Revokes every session an account holds. Called after a password change, so a
 * stolen session cannot outlive the credential it was created with.
 */
export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
  return withPrincipal(AUTHENTICATOR, (tx) =>
    tx.exec(
      `update auth_sessions
          set revoked_at = now()
        where user_id = $1
          and revoked_at is null
          and ($2::uuid is null or id <> $2::uuid)`,
      [userId, exceptSessionId ?? null],
    ),
  );
}

export async function touchSession(sessionId: string): Promise<void> {
  await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.exec('update auth_sessions set last_seen_at = now() where id = $1', [sessionId]),
  );
}

/**
 * True when this account has not signed in from this device before, which is
 * what triggers the new device security email.
 */
export async function isNewDevice(userId: string, deviceLabel: string): Promise<boolean> {
  const row = await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.maybeOne<{ exists: boolean }>(
      `select true as exists
         from auth_sessions
        where user_id = $1 and device_label = $2
        limit 1`,
      [userId, deviceLabel],
    ),
  );
  return row === null;
}

/** Most recent successful sign in before the one happening now. */
export async function lastSuccessfulLogin(userId: string): Promise<Date | null> {
  const row = await withPrincipal(AUTHENTICATOR, (tx) =>
    tx.maybeOne<{ created_at: Date }>(
      `select created_at from auth_events
        where user_id = $1 and event_type = 'login_success'
        order by created_at desc
        limit 1`,
      [userId],
    ),
  );
  return row?.created_at ?? null;
}
