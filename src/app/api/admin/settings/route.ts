import { guardMutation, ok, parseBody, readJson } from '@/lib/api';
import { requireApiAdmin } from '@/lib/auth/api-guards';
import { recordAudit } from '@/lib/auth/events';
import { requestContext } from '@/lib/security/request-context';
import { setLoginNotificationMode } from '@/lib/settings';
import { settingsSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { principal } = auth;

  const parsed = parseBody(settingsSchema, body);
  if (parsed.response) return parsed.response;

  await setLoginNotificationMode(principal, parsed.data.loginNotificationMode);

  const context = await requestContext();
  await recordAudit({
    principal,
    action: 'settings.update',
    entityType: 'app_settings',
    entityId: 'admin_login_notifications',
    summary: `Set sign in notifications to ${parsed.data.loginNotificationMode}`,
    ipHash: context.ipHash,
  });

  return ok({ message: 'Setting saved.' });
}
