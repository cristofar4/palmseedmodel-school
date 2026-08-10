import { NextResponse, type NextRequest } from 'next/server';

const CSRF_COOKIE = 'palmseed_csrf';
const SESSION_COOKIE = 'palmseed_session';

/** Routes that require some signed in account before they render anything. */
const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/teacher'];

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Two jobs, both cheap enough to run on every request.
 *
 * 1. Guarantee a CSRF token cookie exists, since server components cannot set
 *    cookies themselves.
 * 2. Bounce anonymous visitors away from the portal before a page renders.
 *    This is a fast path only. The authoritative check is the session lookup
 *    performed in each protected layout, which validates the token against the
 *    database. A forged cookie gets past the middleware and stops there.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  const needsAccount = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  let response: NextResponse;

  if (needsAccount && !request.cookies.get(SESSION_COOKIE)?.value) {
    const signin = request.nextUrl.clone();
    signin.pathname = '/signin';
    signin.search = '';
    signin.searchParams.set('next', `${pathname}${search}`);
    response = NextResponse.redirect(signin);
  } else {
    response = NextResponse.next();
  }

  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, randomToken(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation output.
    '/((?!_next/static|_next/image|favicon.ico|brand/|photography/|.*\\.(?:svg|png|jpg|jpeg|webp|avif|gif|ico|woff|woff2)$).*)',
  ],
};
