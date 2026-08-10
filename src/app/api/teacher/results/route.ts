import { fail, guardMutation, ok, parseBody, readJson } from '@/lib/api';
import { requireApiStaff } from '@/lib/auth/api-guards';
import { recordAudit } from '@/lib/auth/events';
import { withPrincipal } from '@/lib/db/pool';
import { requestContext } from '@/lib/security/request-context';
import { resultEntrySchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Records assessment and examination scores for one class and subject.
 *
 * Totals and grades are never accepted from the client. They are generated
 * columns in the database, so what a student eventually sees is always
 * arithmetic on the two numbers a teacher actually entered.
 *
 * Publishing is a separate, deliberate flag. Until it is set, the rows exist
 * but the student policy hides them, so half entered marks are never visible.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const auth = await requireApiStaff();
  if ('response' in auth) return auth.response;
  const { user, principal } = auth;

  const parsed = parseBody(resultEntrySchema, body);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  const session = await withPrincipal(principal, (tx) =>
    tx.maybeOne<{ id: string }>('select id from academic_sessions where is_current'),
  );
  if (!session) return fail('No academic session is marked as current.', 422);

  const written = await withPrincipal(principal, async (tx) => {
    let count = 0;

    for (const entry of input.entries) {
      // A row with nothing in it is not worth storing.
      if (entry.caScore === null && entry.examScore === null && !entry.remark) continue;

      count += await tx.exec(
        `insert into results
           (student_profile_id, class_id, subject_id, session_id, term_id,
            ca_score, exam_score, teacher_remark, entered_by, published_at)
         values ($1,$2,$3,$4,$5,$6,$7,nullif($8,''),$9, case when $10 then now() else null end)
         on conflict (student_profile_id, subject_id, term_id) do update
           set ca_score = excluded.ca_score,
               exam_score = excluded.exam_score,
               teacher_remark = excluded.teacher_remark,
               entered_by = excluded.entered_by,
               published_at = case when $10 then now() else results.published_at end`,
        [
          entry.studentProfileId,
          input.classId,
          input.subjectId,
          session.id,
          input.termId,
          entry.caScore,
          entry.examScore,
          entry.remark ?? '',
          user.id,
          input.publish,
        ],
      );
    }

    return count;
  });

  if (written === 0) {
    return fail(
      'Nothing was saved. Enter at least one score, and check that this class and subject are assigned to you.',
      422,
    );
  }

  const context = await requestContext();
  await recordAudit({
    principal,
    action: input.publish ? 'results.publish' : 'results.record',
    entityType: 'class',
    entityId: input.classId,
    summary: `${input.publish ? 'Published' : 'Saved'} results for ${written} student(s)`,
    changes: { subjectId: input.subjectId, termId: input.termId },
    ipHash: context.ipHash,
  });

  return ok({
    recorded: written,
    message: input.publish
      ? `Results saved and published for ${written} student(s). They are now visible to those students.`
      : `Results saved for ${written} student(s). They stay hidden from students until you publish them.`,
  });
}
