import { z } from 'zod';
import { fail, guardMutation, ok, parseBody, readJson } from '@/lib/api';
import { currentUser, principalFor } from '@/lib/auth/session';
import { recordAudit } from '@/lib/auth/events';
import { withPrincipal } from '@/lib/db/pool';
import { phoneSchema } from '@/lib/validation';
import { requestContext } from '@/lib/security/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The contact details an account holder may change themselves.
 *
 * Deliberately narrow. Name, class, admission number and status are school
 * records and are only ever changed by an administrator.
 */
const schema = z.object({
  phone: phoneSchema,
  homeAddress: z.string().trim().max(300).optional().or(z.literal('')),
});

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const user = await currentUser();
  if (!user) return fail('Please sign in again.', 401);

  const parsed = parseBody(schema, body);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  const principal = principalFor(user);

  await withPrincipal(principal, async (tx) => {
    await tx.exec('update users set phone = $2 where id = $1', [user.id, input.phone]);

    // Students carry an address on their profile. Staff accounts do not.
    if (user.role === 'student') {
      await tx.exec(
        `update student_profiles set home_address = nullif($2, '') where user_id = $1`,
        [user.id, input.homeAddress ?? ''],
      );
    }
  });

  const context = await requestContext();
  await recordAudit({
    principal,
    action: 'profile.update',
    entityType: 'user',
    entityId: user.id,
    summary: 'Account holder updated their own contact details',
    ipHash: context.ipHash,
  });

  return ok({ message: 'Your details have been saved.' });
}
