import { fail, guardMutation, ok, parseBody, readJson } from '@/lib/api';
import { requireApiAdmin } from '@/lib/auth/api-guards';
import { recordAudit } from '@/lib/auth/events';
import { withPrincipal } from '@/lib/db/pool';
import { requestContext } from '@/lib/security/request-context';
import { assignTeacherSchema, removeAssignmentSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Assigns a teacher to a class, either for one subject or as the form teacher.
 *
 * This is what the teacher portal reads. Without a row here a teaching account
 * can sign in but reaches nothing, which is deliberate: access follows the
 * assignment rather than the role.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { principal } = auth;

  const parsed = parseBody(assignTeacherSchema, body);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  try {
    const created = await withPrincipal(principal, async (tx) => {
      const row = await tx.one<{ id: string; teacher_name: string; class_label: string }>(
        `insert into teacher_assignments (teacher_id, class_id, subject_id, session_id, is_form_teacher)
         values ($1, $2, nullif($3, '')::uuid, $4, $5)
         returning id,
           (select u.full_name from teachers t join users u on u.id = t.user_id where t.id = $1) as teacher_name,
           (select palmseed_class_label(c.level, c.stream, c.arm) from classes c where c.id = $2) as class_label`,
        [
          input.teacherId,
          input.classId,
          input.isFormTeacher ? '' : (input.subjectId ?? ''),
          input.sessionId,
          input.isFormTeacher,
        ],
      );
      return row;
    });

    const context = await requestContext();
    await recordAudit({
      principal,
      action: 'teacher.assign',
      entityType: 'teacher_assignment',
      entityId: created.id,
      summary: `Assigned ${created.teacher_name} to ${created.class_label}`,
      changes: { subjectId: input.subjectId ?? null, isFormTeacher: input.isFormTeacher },
      ipHash: context.ipHash,
    });

    return ok({ id: created.id, message: `Assigned to ${created.class_label}.` }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /teacher_assignments_.*unique/.test(error.message)) {
      return fail('That teacher already holds this assignment.', 409);
    }
    if (error instanceof Error && /foreign key/i.test(error.message)) {
      return fail('That teacher, class, subject or session could not be found.', 422);
    }
    throw error;
  }
}

/** Removes an assignment, which closes that class to the teacher immediately. */
export async function DELETE(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { principal } = auth;

  const parsed = parseBody(removeAssignmentSchema, body);
  if (parsed.response) return parsed.response;

  const removed = await withPrincipal(principal, (tx) =>
    tx.exec('delete from teacher_assignments where id = $1', [parsed.data.assignmentId]),
  );

  if (removed === 0) return fail('That assignment could not be found.', 404);

  const context = await requestContext();
  await recordAudit({
    principal,
    action: 'teacher.unassign',
    entityType: 'teacher_assignment',
    entityId: parsed.data.assignmentId,
    summary: 'Removed a teaching assignment',
    ipHash: context.ipHash,
  });

  return ok({ message: 'Assignment removed.' });
}
