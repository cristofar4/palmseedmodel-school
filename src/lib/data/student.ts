import 'server-only';
import { withPrincipal, type Principal } from '@/lib/db/pool';

/**
 * Everything the student portal reads.
 *
 * Every query runs as the signed in student, so row level security is the
 * thing that limits the result set. None of these functions takes a student
 * identifier from the caller, which means there is no parameter to tamper
 * with and no way to ask for somebody else's record.
 */

export interface StudentOverview {
  profile_id: string | null;
  admission_number: string | null;
  date_of_birth: Date | null;
  gender: string | null;
  previous_school: string | null;
  home_address: string | null;
  photo_path: string | null;
  admitted_on: Date | null;
  class_label: string | null;
  class_id: string | null;
  session_name: string | null;
  term_name: string | null;
  term_id: string | null;
  guardian_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  guardian_relationship: string | null;
  application_status: string | null;
  class_applying_for: string | null;
  stream_preference: string | null;
  submitted_at: Date | null;
  review_note: string | null;
}

export async function studentOverview(principal: Principal): Promise<StudentOverview | null> {
  return withPrincipal(principal, (tx) =>
    tx.maybeOne<StudentOverview>(
      `
      select sp.id                as profile_id,
             sp.admission_number,
             sp.date_of_birth,
             sp.gender,
             sp.previous_school,
             sp.home_address,
             sp.photo_path,
             sp.admitted_on,
             sp.class_id,
             case when c.id is null then null
                  else palmseed_class_label(c.level, c.stream, c.arm) end as class_label,
             s.name               as session_name,
             t.name               as term_name,
             t.id                 as term_id,
             g.full_name          as guardian_name,
             g.email              as guardian_email,
             g.phone              as guardian_phone,
             g.relationship       as guardian_relationship,
             a.status             as application_status,
             a.class_applying_for,
             a.stream_preference,
             a.submitted_at,
             a.review_note
        from student_profiles sp
        left join classes c            on c.id = sp.class_id
        left join academic_sessions s  on s.is_current
        left join terms t              on t.is_current
        left join guardian_profiles g  on g.student_profile_id = sp.id and g.is_primary
        left join applications a       on a.student_profile_id = sp.id
       limit 1
      `,
    ),
  );
}

export interface SubjectResult {
  subject_name: string;
  subject_code: string;
  ca_score: string | null;
  exam_score: string | null;
  total_score: string | null;
  grade: string | null;
  teacher_remark: string | null;
  term_name: string;
  session_name: string;
}

/** Published results only. Unpublished rows are filtered by the policy. */
export async function studentResults(principal: Principal): Promise<SubjectResult[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<SubjectResult>(
      `
      select sub.name as subject_name,
             sub.code as subject_code,
             r.ca_score, r.exam_score, r.total_score, r.grade, r.teacher_remark,
             t.name   as term_name,
             s.name   as session_name
        from results r
        join subjects sub          on sub.id = r.subject_id
        join terms t               on t.id = r.term_id
        join academic_sessions s   on s.id = r.session_id
       order by s.starts_on desc, t.starts_on desc, sub.name
      `,
    ),
  );
}

export interface TermRemarkRow {
  form_teacher_remark: string | null;
  principal_remark: string | null;
  term_name: string;
}

export async function studentTermRemarks(principal: Principal): Promise<TermRemarkRow[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<TermRemarkRow>(
      `select tr.form_teacher_remark, tr.principal_remark, t.name as term_name
         from term_remarks tr
         join terms t on t.id = tr.term_id
        order by t.starts_on desc`,
    ),
  );
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

export async function studentAttendance(principal: Principal): Promise<AttendanceSummary> {
  const row = await withPrincipal(principal, (tx) =>
    tx.maybeOne<{
      present: string;
      absent: string;
      late: string;
      excused: string;
      total: string;
    }>(
      `select
         count(*) filter (where status = 'present') as present,
         count(*) filter (where status = 'absent')  as absent,
         count(*) filter (where status = 'late')    as late,
         count(*) filter (where status = 'excused') as excused,
         count(*)                                   as total
       from attendance`,
    ),
  );

  return {
    present: Number(row?.present ?? 0),
    absent: Number(row?.absent ?? 0),
    late: Number(row?.late ?? 0),
    excused: Number(row?.excused ?? 0),
    total: Number(row?.total ?? 0),
  };
}

export interface TimetableSlot {
  day_of_week: number;
  period_index: number;
  starts_at: string;
  ends_at: string;
  subject_name: string | null;
  label: string | null;
  room: string | null;
  teacher_name: string | null;
}

export async function studentTimetable(principal: Principal): Promise<TimetableSlot[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<TimetableSlot>(
      `select tt.day_of_week, tt.period_index, tt.starts_at, tt.ends_at,
              sub.name as subject_name, tt.label, tt.room,
              u.full_name as teacher_name
         from timetables tt
         left join subjects sub on sub.id = tt.subject_id
         left join teachers te  on te.id = tt.teacher_id
         left join users u      on u.id = te.user_id
        order by tt.day_of_week, tt.period_index`,
    ),
  );
}

export interface StudentSubject {
  name: string;
  code: string;
  is_core: boolean;
}

export async function studentSubjects(principal: Principal): Promise<StudentSubject[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<StudentSubject>(
      `select distinct sub.name, sub.code, cs.is_core
         from student_profiles sp
         join class_subjects cs on cs.class_id = sp.class_id
         join subjects sub      on sub.id = cs.subject_id
        order by cs.is_core desc, sub.name`,
    ),
  );
}

export interface StudentAssignment {
  id: string;
  title: string;
  instructions: string;
  due_at: Date;
  max_score: string;
  subject_name: string;
  submitted_at: Date | null;
  score: string | null;
  feedback: string | null;
  is_overdue: boolean;
}

export async function studentAssignments(principal: Principal): Promise<StudentAssignment[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<StudentAssignment>(
      // Overdue is decided by the database clock rather than the render, so
      // the answer does not depend on when the page happened to be built.
      `select a.id, a.title, a.instructions, a.due_at, a.max_score,
              sub.name as subject_name,
              sm.submitted_at, sm.score, sm.feedback,
              (sm.submitted_at is null and a.due_at < now()) as is_overdue
         from assignments a
         join subjects sub on sub.id = a.subject_id
         left join assignment_submissions sm
                on sm.assignment_id = a.id
               and sm.student_profile_id = palmseed_current_student_profile_id()
        order by a.due_at desc`,
    ),
  );
}

export interface StudentFee {
  id: string;
  description: string;
  amount_kobo: string;
  amount_paid_kobo: string;
  status: string;
  due_on: Date | null;
  term_name: string;
}

export async function studentFees(principal: Principal): Promise<StudentFee[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<StudentFee>(
      `select f.id, f.description, f.amount_kobo, f.amount_paid_kobo, f.status, f.due_on,
              t.name as term_name
         from fees f
         join terms t on t.id = f.term_id
        order by f.created_at desc`,
    ),
  );
}

export interface PortalAnnouncement {
  id: string;
  title: string;
  body: string;
  published_at: Date;
  audience: string;
  is_pinned: boolean;
}

export async function portalAnnouncements(
  principal: Principal,
  limit = 20,
): Promise<PortalAnnouncement[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<PortalAnnouncement>(
      `select id, title, body, published_at, audience, is_pinned
         from announcements
        where published_at is not null
        order by is_pinned desc, published_at desc
        limit $1`,
      [limit],
    ),
  );
}

export interface PortalMessage {
  id: string;
  subject: string;
  body: string;
  created_at: Date;
  read_at: Date | null;
  sender_name: string | null;
}

export async function portalMessages(principal: Principal): Promise<PortalMessage[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<PortalMessage>(
      `select m.id, m.subject, m.body, m.created_at, m.read_at,
              u.full_name as sender_name
         from messages m
         left join users u on u.id = m.sender_user_id
        where m.recipient_user_id = palmseed_current_user_id()
        order by m.created_at desc
        limit 50`,
    ),
  );
}

export interface DeviceSession {
  id: string;
  device_label: string | null;
  created_at: Date;
  last_seen_at: Date;
  expires_at: Date;
}

/** Signed in devices, shown on the security page. */
export async function activeSessions(principal: Principal): Promise<DeviceSession[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<DeviceSession>(
      `select id, device_label, created_at, last_seen_at, expires_at
         from auth_sessions
        where user_id = palmseed_current_user_id()
          and revoked_at is null
          and expires_at > now()
        order by last_seen_at desc`,
    ),
  );
}

export interface OwnAuthEvent {
  event_type: string;
  created_at: Date;
  browser: string | null;
  operating_system: string | null;
  device_type: string | null;
  ip_region: string | null;
}

/** The account holder's own security history. */
export async function ownAuthEvents(principal: Principal, limit = 12): Promise<OwnAuthEvent[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<OwnAuthEvent>(
      `select event_type, created_at, browser, operating_system, device_type, ip_region
         from auth_events
        where user_id = palmseed_current_user_id()
        order by created_at desc
        limit $1`,
      [limit],
    ),
  );
}
