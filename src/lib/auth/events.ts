import 'server-only';
import { AUTHENTICATOR, withPrincipal, type Principal } from '@/lib/db/pool';
import type { RequestContext } from '@/lib/security/request-context';

export type AuthEventType =
  | 'signup'
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'email_verification_sent'
  | 'email_verified'
  | 'password_reset_requested'
  | 'password_reset_failed'
  | 'password_changed'
  | 'account_approved'
  | 'account_rejected'
  | 'account_suspended'
  | 'account_activated';

export interface AuthEventInput {
  type: AuthEventType;
  userId?: string | null;
  emailAttempted?: string | null;
  accountStatus?: string | null;
  admissionNumber?: string | null;
  isNewDevice?: boolean;
  detail?: Record<string, unknown>;
  context: RequestContext;
}

/**
 * Appends to the authentication activity trail that the administrator
 * dashboard reads.
 *
 * Recording is best effort by design. A logging failure must never be the
 * reason a sign in or a password reset fails, so the error is swallowed after
 * being surfaced on the server console.
 */
export async function recordAuthEvent(input: AuthEventInput): Promise<void> {
  const { context } = input;

  try {
    await withPrincipal(AUTHENTICATOR, (tx) =>
      tx.exec(
        `insert into auth_events (
           user_id, email_attempted, event_type, account_status, admission_number,
           ip_hash, ip_region, user_agent, device_type, browser, operating_system,
           is_new_device, detail
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          input.userId ?? null,
          input.emailAttempted?.toLowerCase() ?? null,
          input.type,
          input.accountStatus ?? null,
          input.admissionNumber ?? null,
          context.ipHash,
          context.region,
          context.userAgent,
          context.deviceType,
          context.browser,
          context.operatingSystem,
          input.isNewDevice ?? false,
          JSON.stringify(input.detail ?? {}),
        ],
      ),
    );
  } catch (error) {
    console.error('[auth-event] failed to record', input.type, error);
  }
}

export interface AuditLogInput {
  principal: Principal;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string | null;
  changes?: Record<string, unknown>;
  ipHash?: string | null;
}

/** Records an administrative or teaching mutation for accountability. */
export async function recordAudit(input: AuditLogInput): Promise<void> {
  try {
    await withPrincipal(input.principal, (tx) =>
      tx.exec(
        `insert into audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, summary, changes, ip_hash)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          input.principal.kind === 'user' ? input.principal.userId : null,
          input.actorRole ?? (input.principal.kind === 'user' ? input.principal.role : null),
          input.action,
          input.entityType,
          input.entityId ?? null,
          input.summary ?? null,
          JSON.stringify(input.changes ?? {}),
          input.ipHash ?? null,
        ],
      ),
    );
  } catch (error) {
    console.error('[audit] failed to record', input.action, error);
  }
}
