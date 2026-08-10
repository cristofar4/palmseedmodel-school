import { requireAdmin } from '@/lib/auth/guards';
import { Panel, DetailRow } from '@/components/ui/Layout';
import { Alert } from '@/components/ui/Feedback';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { csrfToken } from '@/lib/security/csrf';
import { loginNotificationMode } from '@/lib/settings';
import { emailIsLive } from '@/lib/env';
import { SCHOOL, siteUrl } from '@/lib/school';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireAdmin();

  const [mode, token] = await Promise.all([loginNotificationMode(), csrfToken()]);
  const live = emailIsLive();

  return (
    <div className="flex flex-col gap-7">
      <Panel
        title="Sign in notifications"
        description="Controls the email you receive when a student signs in to the portal."
      >
        <SettingsForm csrfToken={token} current={mode} />
      </Panel>

      <Panel title="Email configuration" description="Read from the server environment.">
        {!live ? (
          <div className="mb-5">
            <Alert tone="warning" title="Delivery is switched off">
              RESEND_API_KEY is not set, so messages are rendered and recorded but never leave the
              server. Set the key in the deployment environment to switch delivery on.
            </Alert>
          </div>
        ) : null}

        <dl>
          <DetailRow label="Delivery" value={live ? 'Live through Resend' : 'Simulated, recorded only'} />
          <DetailRow
            label="From address"
            value={process.env.EMAIL_FROM ?? 'Not configured'}
          />
          <DetailRow label="Reply address" value={SCHOOL.replyEmail} />
          <DetailRow
            label="Administrator notifications"
            value={process.env.ADMIN_NOTIFICATION_EMAIL ?? SCHOOL.replyEmail}
          />
          <DetailRow label="Site address" value={siteUrl()} />
        </dl>

        <p className="mt-5 text-[0.75rem] leading-relaxed text-ink-400">
          These values are set as environment variables and are never editable from the browser. The
          Resend key itself is not displayed anywhere in this interface.
        </p>
      </Panel>

      <Panel title="School details" description="Shown on the website wherever they are set.">
        <dl>
          <DetailRow label="Name" value={SCHOOL.name} />
          <DetailRow label="Motto" value={SCHOOL.motto} />
          <DetailRow label="Country" value={SCHOOL.country} />
          <DetailRow label="Timezone" value={SCHOOL.timezone} />
          <DetailRow label="Street address" value={SCHOOL.streetAddress ?? 'Not supplied, hidden on the website'} />
          <DetailRow label="Telephone" value={SCHOOL.phone ?? 'Not supplied, hidden on the website'} />
        </dl>

        <p className="mt-5 text-[0.75rem] leading-relaxed text-ink-400">
          Anything not supplied is hidden rather than filled with a placeholder. To publish the
          address and telephone number, set them in src/lib/school.ts and deploy.
        </p>
      </Panel>
    </div>
  );
}
