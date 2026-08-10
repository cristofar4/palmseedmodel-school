'use client';

export interface RequestOutcome<T> {
  ok: boolean;
  data?: T;
  error?: string;
  fields?: Record<string, string>;
  status: number;
}

/**
 * The single way the browser talks to the API.
 *
 * Always returns an outcome rather than throwing, so every form can render a
 * message instead of falling over. The CSRF token is rendered into the page by
 * a server component and passed in, because the cookie holding it is http only
 * and deliberately unreadable from script.
 */
export async function postJson<T>(
  url: string,
  body: Record<string, unknown>,
  csrfToken: string,
): Promise<RequestOutcome<T>> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-palmseed-csrf': csrfToken,
      },
      body: JSON.stringify({ ...body, csrfToken }),
      credentials: 'same-origin',
    });

    const payload: unknown = await response.json().catch(() => null);

    if (payload && typeof payload === 'object' && 'ok' in payload) {
      const envelope = payload as {
        ok: boolean;
        data?: T;
        error?: string;
        fields?: Record<string, string>;
      };

      return {
        ok: envelope.ok && response.ok,
        data: envelope.data,
        error: envelope.error,
        fields: envelope.fields,
        status: response.status,
      };
    }

    return {
      ok: false,
      error: 'The server sent an unexpected response. Please try again.',
      status: response.status,
    };
  } catch {
    // Network failure, an offline phone, or a request that was cut short.
    return {
      ok: false,
      error: 'We could not reach the school server. Check your connection and try again.',
      status: 0,
    };
  }
}
