import { guardMutation, ok, readJson } from '@/lib/api';
import { recordAuthEvent } from '@/lib/auth/events';
import { currentUser, destroyCurrentSession } from '@/lib/auth/session';
import { requestContext } from '@/lib/security/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const user = await currentUser();
  await destroyCurrentSession();

  if (user) {
    await recordAuthEvent({
      type: 'logout',
      userId: user.id,
      emailAttempted: user.email,
      accountStatus: user.status,
      context: await requestContext(),
    });
  }

  return ok({ next: '/' });
}
