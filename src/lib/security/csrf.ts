import 'server-only';
import { cookies } from 'next/headers';
import { safeEqual } from './tokens';

export const CSRF_COOKIE = 'palmseed_csrf';
export const CSRF_FIELD = 'csrfToken';
export const CSRF_HEADER = 'x-palmseed-csrf';

/**
 * Reads the per browser CSRF token. The cookie itself is planted by the
 * middleware, because a server component is not allowed to set cookies.
 *
 * This is the synchroniser token pattern: the value is stored in an http only
 * cookie and echoed back in the request body or a header. A cross site page
 * can cause the cookie to be sent but cannot read it, so it cannot produce the
 * matching echo.
 */
export async function csrfToken(): Promise<string> {
  const store = await cookies();
  return store.get(CSRF_COOKIE)?.value ?? '';
}

/** Verifies the echoed token against the cookie in constant time. */
export async function csrfTokenIsValid(provided: string | null | undefined): Promise<boolean> {
  if (!provided) return false;
  const expected = await csrfToken();
  if (!expected) return false;
  return safeEqual(provided, expected);
}
