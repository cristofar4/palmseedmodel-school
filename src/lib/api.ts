import 'server-only';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { CSRF_FIELD, CSRF_HEADER, csrfTokenIsValid } from '@/lib/security/csrf';
import { sameOriginRequest } from '@/lib/security/request-context';
import { fieldErrors } from '@/lib/validation';

export interface ApiFailure {
  ok: false;
  error: string;
  fields?: Record<string, string>;
  retryAfterSeconds?: number;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true, data } as const, init);
}

export function fail(
  error: string,
  status = 400,
  extra?: Omit<ApiFailure, 'ok' | 'error'>,
): NextResponse<ApiFailure> {
  return NextResponse.json({ ok: false, error, ...extra } as const, { status });
}

/**
 * Cross site request protection for the route handlers.
 *
 * Two independent checks: the request must come from this origin, and it must
 * echo the token held in the http only CSRF cookie. Either one alone stops the
 * common cases, together they cover the gaps in each.
 */
export async function guardMutation(body: unknown): Promise<NextResponse<ApiFailure> | null> {
  if (!(await sameOriginRequest())) {
    return fail('This request did not come from the Palmseed website.', 403);
  }

  const fromBody =
    body && typeof body === 'object' && CSRF_FIELD in body
      ? String((body as Record<string, unknown>)[CSRF_FIELD] ?? '')
      : null;

  const { headers } = await import('next/headers');
  const fromHeader = (await headers()).get(CSRF_HEADER);

  if (!(await csrfTokenIsValid(fromBody ?? fromHeader))) {
    return fail('Your session token has expired. Refresh the page and try again.', 403);
  }

  return null;
}

/** Reads and parses a JSON body without throwing on malformed input. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await request.json();
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

/** Validates a body and returns either the parsed value or a ready response. */
export function parseBody<T extends z.ZodType>(
  schema: T,
  body: unknown,
): { data: z.output<T>; response?: never } | { data?: never; response: NextResponse<ApiFailure> } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      response: fail('Please check the highlighted fields.', 422, {
        fields: fieldErrors(result.error),
      }),
    };
  }
  return { data: result.data };
}

/** Standard response when a rate limit has been reached. */
export function rateLimited(retryAfterSeconds: number): NextResponse<ApiFailure> {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return NextResponse.json(
    {
      ok: false,
      error: `Too many attempts. Please wait about ${minutes} minute${minutes === 1 ? '' : 's'} and try again.`,
      retryAfterSeconds,
    } as const,
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}
