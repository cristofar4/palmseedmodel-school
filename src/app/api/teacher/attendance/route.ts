import { fail, guardMutation, ok, parseBody, readJson } from '@/lib/api';
import { requireApiStaff } from '@/lib/auth/api-guards';
import { recordAudit } from '@/lib/auth/events';
import { withPrincipal } from '@/lib/db/pool';
import { requestContext } from '@/lib/security/request-context';
import { attendanceEntrySchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Records the register for one class on one date.
 *
 * Written as an upsert so a teacher can correct a mistake by submitting again.
 * Row level security refuses the write outright if the class is not one they
 * are assigned to, which is the real guard rather than the check below.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const auth = await requireApiStaff();
  if ('response' in auth) return auth.response;
  const { user, principal } = auth;

  const parsed = parseBody(attendanceEntrySchema, body);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  const session = await withPrincipal(principal, (tx) =>
    tx.maybeOne<{ id: string }>('select id from academic_sessions where is_current'),
  );
  if (!session) return fail('No academic session is marked as current.', 422);

  try {
    const written = await withPrincipal(principal, async (tx) => {
      let count = 0;

      for (const entry of input.entries) {
        count += await tx.exec(
          `insert into attendance
             (student_profile_id, class_id, session_id, term_id, attendance_date, status, note, recorded_by)
           values ($1, $2, $3, $4, $5, $6, nullif($7, ''), $8)
           on conflict (student_profile_id, attendance_date) do update
             set status = excluded.status,
                 note = excluded.note,
                 recorded_by = excluded.recorded_by`,
          [
            entry.studentProfileId,
            input.classId,
            session.id,
            input.termId,
            input.attendanceDate,
            entry.status,
            entry.note ?? '',
            user.id,
          ],
        );
      }

      return count;
    });

    if (written === 0) {
      return fail('You are not assigned to that class.', 403);
    }

    const context = await requestContext();
    await recordAudit({
      principal,
      action: 'attendance.record',
      entityType: 'class',
      entityId: input.classId,
      summary: `Recorded attendance for ${written} student(s) on ${input.attendanceDate}`,
      ipHash: context.ipHash,
    });

    return ok({ recorded: written, message: `Attendance saved for ${written} student(s).` });
  } catch (error) {
    if (error instanceof Error && /attendance_not_future/.test(error.message)) {
      return fail('Attendance cannot be recorded for a future date.', 422, {
        fields: { attendanceDate: 'Choose today or an earlier date.' },
      });
    }
    throw error;
  }
}
