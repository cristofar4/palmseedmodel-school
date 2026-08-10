import { fail, guardMutation, ok, parseBody, readJson } from '@/lib/api';
import { requireApiAdmin } from '@/lib/auth/api-guards';
import { recordAudit, recordAuthEvent } from '@/lib/auth/events';
import { revokeAllSessions } from '@/lib/auth/session';
import { withPrincipal } from '@/lib/db/pool';
import { requestContext } from '@/lib/security/request-context';
import { updateStatusSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Changes an account status. Suspension also ends every live session. */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { user: admin, principal } = auth;

  const parsed = parseBody(updateStatusSchema, body);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  if (input.userId === admin.id) {
    return fail('You cannot change the status of your own account.', 422);
  }

  const target = await withPrincipal(principal, (tx) =>
    tx.maybeOne<{ id: string; full_name: string; email: string; status: string; role: string }>(
      'select id, full_name, email, status, role from users where id = $1',
      [input.userId],
    ),
  );

  if (!target) return fail('That account could not be found.', 404);

  await withPrincipal(principal, (tx) =>
    tx.exec('update users set status = $2 where id = $1', [input.userId, input.status]),
  );

  // A suspended account must lose its live sessions immediately, otherwise it
  // keeps working until the cookie happens to expire.
  let revoked = 0;
  if (input.status === 'suspended' || input.status === 'rejected') {
    revoked = await revokeAllSessions(input.userId);
  }

  const context = await requestContext();

  const eventType =
    input.status === 'suspended'
      ? 'account_suspended'
      : input.status === 'active'
        ? 'account_activated'
        : input.status === 'rejected'
          ? 'account_rejected'
          : null;

  if (eventType) {
    await recordAuthEvent({
      type: eventType,
      userId: target.id,
      emailAttempted: target.email,
      accountStatus: input.status,
      context,
    });
  }

  await recordAudit({
    principal,
    action: 'account.status',
    entityType: 'user',
    entityId: target.id,
    summary: `Changed ${target.full_name} from ${target.status} to ${input.status}`,
    changes: { from: target.status, to: input.status, reason: input.reason ?? '', revoked },
    ipHash: context.ipHash,
  });

  return ok({ status: input.status, revokedSessions: revoked });
}
