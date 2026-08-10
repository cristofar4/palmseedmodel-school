import { requireStudent, isEnrolled } from '@/lib/auth/guards';
import {
  studentAttendance,
  studentResults,
  studentSubjects,
  studentTermRemarks,
} from '@/lib/data/student';
import { Panel, Stat } from '@/components/ui/Layout';
import { Alert, EmptyState } from '@/components/ui/Feedback';

export const dynamic = 'force-dynamic';

export default async function StudentRecordsPage() {
  const { user, principal } = await requireStudent();

  if (!isEnrolled(user)) {
    return (
      <Alert tone="info" title="This section is not open yet">
        Subjects, results and attendance appear here once the school has approved your registration
        and assigned a class.
      </Alert>
    );
  }

  const [subjects, results, attendance, remarks] = await Promise.all([
    studentSubjects(principal),
    studentResults(principal),
    studentAttendance(principal),
    studentTermRemarks(principal),
  ]);

  const attended = attendance.present + attendance.late;
  const rate =
    attendance.total > 0 ? `${Math.round((attended / attendance.total) * 100)}%` : 'Not recorded';

  return (
    <div className="flex flex-col gap-7">
      {/* Attendance --------------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Attendance" value={rate} accent />
        <Stat label="Present" value={attendance.present} />
        <Stat label="Late" value={attendance.late} />
        <Stat label="Absent" value={attendance.absent} />
        <Stat label="Excused" value={attendance.excused} />
      </div>

      {attendance.total === 0 ? (
        <Alert tone="info">
          No attendance has been recorded for this session yet. Figures appear here once teachers
          begin taking the register.
        </Alert>
      ) : null}

      {/* Subjects ------------------------------------------------------------ */}
      <Panel title="Subjects" description="The subjects offered to your class this session.">
        {subjects.length === 0 ? (
          <EmptyState
            title="No subjects have been set for your class yet."
            description="The school assigns subjects to each class at the start of a session."
          />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <li
                key={subject.code}
                className="flex items-center justify-between border border-ink-100 px-4 py-3"
              >
                <span className="text-[0.9375rem]">{subject.name}</span>
                <span className="text-[0.6875rem] uppercase tracking-[0.1em] text-ink-400">
                  {subject.is_core ? 'Core' : 'Elective'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Results -------------------------------------------------------------- */}
      <Panel
        title="Results"
        description="Continuous assessment is out of 40 and the examination is out of 60. Only results the school has published appear here."
        bodyClassName="p-0 sm:px-5 sm:py-5"
      >
        {results.length === 0 ? (
          <div className="px-5 py-5 sm:p-0">
            <EmptyState
              title="No results have been published yet."
              description="Scores appear here once your teachers have entered them and the school has published the term."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-left">
              <caption className="sr-only">Published subject results</caption>
              <thead>
                <tr className="border-b border-ink-200">
                  {['Subject', 'Term', 'Assessment', 'Examination', 'Total', 'Grade', 'Remark'].map(
                    (heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-3 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-400"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {results.map((row, index) => (
                  <tr key={`${row.subject_code}-${row.term_name}-${index}`} className="border-b border-ink-100">
                    <th scope="row" className="px-3 py-3 text-[0.9375rem] font-normal">
                      {row.subject_name}
                    </th>
                    <td className="px-3 py-3 text-[0.8125rem] text-ink-500">{row.term_name}</td>
                    <td className="px-3 py-3 text-[0.9375rem] tabular-nums">{row.ca_score ?? '.'}</td>
                    <td className="px-3 py-3 text-[0.9375rem] tabular-nums">{row.exam_score ?? '.'}</td>
                    <td className="px-3 py-3 text-[0.9375rem] font-medium tabular-nums">
                      {row.total_score ?? '.'}
                    </td>
                    <td className="px-3 py-3">
                      <span className="border border-ink-200 px-2 py-1 text-[0.75rem] font-semibold">
                        {row.grade ?? '.'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[0.8125rem] text-ink-500">
                      {row.teacher_remark ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Teacher remarks ------------------------------------------------------- */}
      <Panel title="Teacher remarks">
        {remarks.length === 0 ? (
          <EmptyState
            title="No remarks have been published yet."
            description="A form teacher remark is written at the end of each term."
          />
        ) : (
          <ul className="flex flex-col gap-5">
            {remarks.map((remark) => (
              <li key={remark.term_name} className="border-l-2 border-brand pl-5">
                <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-ink-400">
                  {remark.term_name}
                </p>
                {remark.form_teacher_remark ? (
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-700">
                    {remark.form_teacher_remark}
                  </p>
                ) : null}
                {remark.principal_remark ? (
                  <p className="mt-3 text-[0.9375rem] italic leading-relaxed text-ink-600">
                    {remark.principal_remark}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
