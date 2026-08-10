import 'server-only';
import { withPrincipal, type Principal } from '@/lib/db/pool';

/**
 * Reads for the teacher portal.
 *
 * Nothing here takes a teacher identifier. The signed in teacher is resolved
 * inside the database from the request principal, and row level security
 * limits every result to the classes and subjects they are assigned to.
 */

export interface Assignment {
  assignment_id: string;
  class_id: string;
  class_label: string;
  subject_id: string | null;
  subject_name: string | null;
  is_form_teacher: boolean;
  session_name: string;
  student_count: number;
}

export async function teacherAssignments(principal: Principal): Promise<Assignment[]> {
  const rows = await withPrincipal(principal, (tx) =>
    tx.rows<Omit<Assignment, 'student_count'> & { student_count: string }>(
      `select ta.id as assignment_id,
              c.id as class_id,
              palmseed_class_label(c.level, c.stream, c.arm) as class_label,
              sub.id as subject_id,
              sub.name as subject_name,
              ta.is_form_teacher,
              s.name as session_name,
              (select count(*) from student_profiles sp where sp.class_id = c.id) as student_count
         from teacher_assignments ta
         join classes c              on c.id = ta.class_id
         join academic_sessions s    on s.id = ta.session_id
         left join subjects sub      on sub.id = ta.subject_id
        where ta.teacher_id = palmseed_current_teacher_id()
        order by c.level, c.arm, sub.name nulls first`,
    ),
  );

  return rows.map((row) => ({ ...row, student_count: Number(row.student_count) }));
}

export interface ClassStudent {
  profile_id: string;
  full_name: string;
  admission_number: string | null;
  status: string;
}

/**
 * The roll for one class.
 *
 * The class identifier comes from the caller, but a teacher who is not
 * assigned to it gets an empty list back rather than another class's roll,
 * because the policy filters on the assignment.
 */
export async function classRoll(principal: Principal, classId: string): Promise<ClassStudent[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<ClassStudent>(
      `select sp.id as profile_id, u.full_name, sp.admission_number, u.status
         from student_profiles sp
         join users u on u.id = sp.user_id
        where sp.class_id = $1
          and u.status in ('active', 'graduated')
        order by u.full_name`,
      [classId],
    ),
  );
}

export interface ExistingAttendance {
  student_profile_id: string;
  status: string;
  note: string | null;
}

export async function attendanceForDate(
  principal: Principal,
  classId: string,
  date: string,
): Promise<ExistingAttendance[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<ExistingAttendance>(
      `select student_profile_id, status, note
         from attendance
        where class_id = $1 and attendance_date = $2`,
      [classId, date],
    ),
  );
}

export interface ExistingResult {
  student_profile_id: string;
  ca_score: string | null;
  exam_score: string | null;
  teacher_remark: string | null;
  published_at: Date | null;
}

export async function resultsForSubject(
  principal: Principal,
  classId: string,
  subjectId: string,
  termId: string,
): Promise<ExistingResult[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<ExistingResult>(
      `select student_profile_id, ca_score, exam_score, teacher_remark, published_at
         from results
        where class_id = $1 and subject_id = $2 and term_id = $3`,
      [classId, subjectId, termId],
    ),
  );
}

export interface CurrentPeriod {
  session_id: string | null;
  session_name: string | null;
  term_id: string | null;
  term_name: string | null;
}

export async function currentPeriod(principal: Principal): Promise<CurrentPeriod> {
  const row = await withPrincipal(principal, (tx) =>
    tx.maybeOne<CurrentPeriod>(
      `select s.id as session_id, s.name as session_name, t.id as term_id, t.name as term_name
         from academic_sessions s
         left join terms t on t.is_current
        where s.is_current
        limit 1`,
    ),
  );

  return (
    row ?? { session_id: null, session_name: null, term_id: null, term_name: null }
  );
}
