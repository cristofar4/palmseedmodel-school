import 'server-only';
import { AUTHENTICATOR, withPrincipal, type Principal } from '@/lib/db/pool';

export type LoginNotificationMode = 'all' | 'suspicious_only' | 'off';

const DEFAULT_MODE: LoginNotificationMode = 'all';

/**
 * Administrator controlled behaviour. Kept in a small key value table so it
 * can be changed from the dashboard without a deployment.
 */
export async function loginNotificationMode(): Promise<LoginNotificationMode> {
  try {
    const row = await withPrincipal(AUTHENTICATOR, (tx) =>
      tx.maybeOne<{ value: { mode?: string } }>(
        `select value from app_settings where key = 'admin_login_notifications'`,
      ),
    );

    const mode = row?.value?.mode;
    if (mode === 'all' || mode === 'suspicious_only' || mode === 'off') return mode;
    return DEFAULT_MODE;
  } catch {
    // Notifications default to on if the setting cannot be read.
    return DEFAULT_MODE;
  }
}

export async function setLoginNotificationMode(
  principal: Principal,
  mode: LoginNotificationMode,
): Promise<void> {
  await withPrincipal(principal, (tx) =>
    tx.exec(
      `insert into app_settings (key, value, updated_by, updated_at)
         values ('admin_login_notifications', $1::jsonb, $2, now())
       on conflict (key) do update
         set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
      [JSON.stringify({ mode }), principal.kind === 'user' ? principal.userId : null],
    ),
  );
}

/**
 * Whether the administrator should be emailed about this sign in.
 * A sign in counts as suspicious when it comes from a device the account has
 * not used before.
 */
export function shouldNotifyAdmin(mode: LoginNotificationMode, suspicious: boolean): boolean {
  if (mode === 'off') return false;
  if (mode === 'all') return true;
  return suspicious;
}
