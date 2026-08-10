import { requireStudent, isEnrolled } from '@/lib/auth/guards';
import { studentFees } from '@/lib/data/student';
import { Panel, Stat } from '@/components/ui/Layout';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { formatDate, formatNaira, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function StudentFeesPage() {
  const { user, principal } = await requireStudent();

  if (!isEnrolled(user)) {
    return (
      <Alert tone="info" title="This section is not open yet">
        Fee information appears here once the school has approved your registration.
      </Alert>
    );
  }

  const fees = await studentFees(principal);

  const billed = fees.reduce((sum, fee) => sum + Number(fee.amount_kobo), 0);
  const paid = fees.reduce((sum, fee) => sum + Number(fee.amount_paid_kobo), 0);

  return (
    <div className="flex flex-col gap-7">
      {fees.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Billed" value={formatNaira(billed)} />
          <Stat label="Paid" value={formatNaira(paid)} />
          <Stat label="Outstanding" value={formatNaira(billed - paid)} accent={billed - paid > 0} />
        </div>
      ) : null}

      <Panel
        title="Fees"
        description="Recorded by the school office. Contact the office about any payment that is not shown."
        bodyClassName="p-0 sm:px-5 sm:py-5"
      >
        {fees.length === 0 ? (
          <div className="px-5 py-5 sm:p-0">
            <EmptyState
              title="No fee records have been entered yet."
              description="Nothing is shown here until the school office records a fee against your account. An empty list does not mean nothing is owed, so please contact the office if you are unsure."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] border-collapse text-left">
              <caption className="sr-only">Fee records</caption>
              <thead>
                <tr className="border-b border-ink-200">
                  {['Description', 'Term', 'Amount', 'Paid', 'Due', 'Status'].map((heading) => (
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
                {fees.map((fee) => (
                  <tr key={fee.id} className="border-b border-ink-100">
                    <th scope="row" className="px-3 py-3 text-[0.9375rem] font-normal">
                      {fee.description}
                    </th>
                    <td className="px-3 py-3 text-[0.8125rem] text-ink-500">{fee.term_name}</td>
                    <td className="px-3 py-3 text-[0.9375rem] tabular-nums">
                      {formatNaira(Number(fee.amount_kobo))}
                    </td>
                    <td className="px-3 py-3 text-[0.9375rem] tabular-nums">
                      {formatNaira(Number(fee.amount_paid_kobo))}
                    </td>
                    <td className="px-3 py-3 text-[0.8125rem] text-ink-500">
                      {fee.due_on ? formatDate(fee.due_on) : 'Not set'}
                    </td>
                    <td className="px-3 py-3 text-[0.8125rem]">{titleCase(fee.status)}</td>
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
