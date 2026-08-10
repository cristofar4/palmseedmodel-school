import { requireAdmin } from '@/lib/auth/guards';
import { classOptions, emailLogs, students } from '@/lib/data/admin';
import { Panel } from '@/components/ui/Layout';
import { EmptyState } from '@/components/ui/Feedback';
import { EmailComposer } from '@/components/admin/EmailComposer';
import { csrfToken } from '@/lib/security/csrf';
import { emailIsLive } from '@/lib/env';
import { formatDateTime, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  sent: 'text-[#12603A]',
  simulated: 'text-[#8A5711]',
  failed: 'text-palm-red',
  queued: 'text-ink-500',
};

export default async function AdminEmailPage() {
  const { principal } = await requireAdmin();

  const [logs, classes, roll, token] = await Promise.all([
    emailLogs(principal, 100),
    classOptions(principal),
    students(principal, { limit: 500 }),
    csrfToken(),
  ]);

  const live = emailIsLive();

  return (
    <div className="flex flex-col gap-7">
      <Panel
        title="Compose a message"
        description="Sent through the branded school template and recorded in the delivery history."
      >
        <EmailComposer
          csrfToken={token}
          classes={classes}
          liveDelivery={live}
          studentChoices={roll.map((student) => ({
            user_id: student.user_id,
            full_name: student.full_name,
            admission_number: student.admission_number,
          }))}
        />
      </Panel>

      <Panel
        title="Delivery history"
        description="Every message the platform has attempted, newest first."
        bodyClassName="p-0 sm:px-5 sm:py-5"
      >
        {logs.length === 0 ? (
          <div className="px-5 py-5 sm:p-0">
            <EmptyState
              title="Nothing has been sent yet."
              description="Verification links, approval letters, security notices and anything composed here all appear in this list."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-left">
              <caption className="sr-only">Email delivery history</caption>
              <thead>
                <tr className="border-b border-ink-200">
                  {['Recipient', 'Subject', 'Template', 'Status', 'When'].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-3 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-ink-100">
                    <th scope="row" className="px-3 py-3 font-normal">
                      <span className="block text-[0.875rem]">{log.to_name ?? log.to_email}</span>
                      {log.to_name ? (
                        <span className="block text-[0.75rem] text-ink-400">{log.to_email}</span>
                      ) : null}
                    </th>
                    <td className="px-3 py-3 text-[0.875rem]">{log.subject}</td>
                    <td className="px-3 py-3 text-[0.75rem] text-ink-400">
                      {titleCase(log.template)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-[0.75rem] font-semibold uppercase tracking-[0.08em] ${
                          STATUS_STYLES[log.status] ?? 'text-ink-500'
                        }`}
                      >
                        {log.status}
                      </span>
                      {log.error ? (
                        <span className="mt-0.5 block max-w-[16rem] truncate text-[0.6875rem] text-palm-red">
                          {log.error}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-[0.75rem] text-ink-400">
                      {formatDateTime(log.sent_at ?? log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
