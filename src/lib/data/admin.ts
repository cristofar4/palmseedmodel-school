import 'server-only';
import { withPrincipal, type Principal } from '@/lib/db/pool';

/** Reads for the administrator dashboard. All run as the admin principal. */

export interface AdminCounts {
  total_students: number;
  pending_registrations: number;
  active_students: number;
  suspended_students: number;
  graduated_students: number;
  teachers: number;
  failed_logins_24h: number;
  emails_failed_7d: number;
}

export async function adminCounts(principal: Principal): Promise<AdminCounts> {
  const row = await withPrincipal(principal, (tx) =>
    tx.one<Record<keyof AdminCounts, string>>(
      `select
         (select count(*) from users where role = 'student')                          as total_students,
         (select count(*) from users where role = 'student' and status = 'pending_review') as pending_registrations,
         (select count(*) from users where role = 'student' and status = 'active')    as active_students,
         (select count(*) from users where role = 'student' and status = 'suspended') as suspended_students,
         (select count(*) from users where role = 'student' and status = 'graduated') as graduated_students,
         (select count(*) from teachers)                                              as teachers,
         (select count(*) from auth_events
           where event_type = 'login_failed' and created_at > now() - interval '24 hours') as failed_logins_24h,
         (select count(*) from email_logs
           where status = 'failed' and created_at > now() - interval '7 days')        as emails_failed_7d`,
    ),
  );

  return {
    total_students: Number(row.total_students),
    pending_registrations: Number(row.pending_registrations),
    active_students: Number(row.active_students),
    suspended_students: Number(row.suspended_students),
    graduated_students: Number(row.graduated_students),
    teachers: Number(row.teachers),
    failed_logins_24h: Number(row.failed_logins_24h),
    emails_failed_7d: Number(row.emails_failed_7d),
  };
}

export interface ClassDistributionRow {
  class_id: string;
  class_label: string;
  student_count: number;
  capacity: number | null;
}

export async function classDistribution(principal: Principal): Promise<ClassDistributionRow[]> {
  const rows = await withPrincipal(principal, (tx) =>
    tx.rows<{ class_id: string; class_label: string; student_count: string; capacity: number | null }>(
      `select c.id as class_id,
              palmseed_class_label(c.level, c.stream, c.arm) as class_label,
              count(sp.id) as student_count,
              c.capacity
         from classes c
         left join student_profiles sp on sp.class_id = c.id
        group by c.id, c.level, c.stream, c.arm, c.capacity
        order by c.level, c.stream nulls first, c.arm`,
    ),
  );

  return rows.map((row) => ({
    class_id: row.class_id,
    class_label: row.class_label,
    student_count: Number(row.student_count),
    capacity: row.capacity,
  }));
}

export interface ActivityRow {
  id: string;
  event_type: string;
  created_at: Date;
  full_name: string | null;
  email_attempted: string | null;
  admission_number: string | null;
  account_status: string | null;
  device_type: string | null;
  browser: string | null;
  operating_system: string | null;
  ip_region: string | null;
  is_new_device: boolean;
}

/**
 * The authentication activity feed.
 *
 * Note the absence of any address column. Only the keyed hash is stored, and
 * even that is not surfaced here, because the feed does not need it.
 */
export async function authActivity(
  principal: Principal,
  options: { limit?: number; types?: string[] } = {},
): Promise<ActivityRow[]> {
  const { limit = 40, types } = options;

  return withPrincipal(principal, (tx) =>
    tx.rows<ActivityRow>(
      `select e.id, e.event_type, e.created_at, e.email_attempted, e.admission_number,
              e.account_status, e.device_type, e.browser, e.operating_system,
              e.ip_region, e.is_new_device,
              u.full_name
         from auth_events e
         left join users u on u.id = e.user_id
        where ($2::text[] is null or e.event_type = any($2::text[]))
        order by e.created_at desc
        limit $1`,
      [limit, types ?? null],
    ),
  );
}

export interface PendingApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  class_applying_for: string;
  stream_preference: string | null;
  guardian_name: string;
  guardian_email: string;
  guardian_phone: string;
  submitted_at: Date;
  status: string;
  date_of_birth: Date;
  previous_school: string | null;
  home_address: string | null;
  gender: string | null;
  guardian_relationship: string;
  review_note: string | null;
  reviewed_at: Date | null;
  student_profile_id: string | null;
  email_verified_at: Date | null;
  /** Issued at approval. Null while the registration is still pending. */
  admission_number: string | null;
  class_label: string | null;
}

export async function applications(
  principal: Principal,
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
): Promise<PendingApplication[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<PendingApplication>(
      `select a.id, a.user_id, u.full_name, u.email, u.phone, u.email_verified_at,
              a.class_applying_for, a.stream_preference,
              a.guardian_name, a.guardian_email, a.guardian_phone, a.guardian_relationship,
              a.submitted_at, a.status, a.date_of_birth, a.previous_school, a.home_address,
              a.gender, a.review_note, a.reviewed_at, a.student_profile_id,
              sp.admission_number,
              case when c.id is null then null
                   else palmseed_class_label(c.level, c.stream, c.arm) end as class_label
         from applications a
         join users u on u.id = a.user_id
         left join student_profiles sp on sp.user_id = u.id
         left join classes c on c.id = sp.class_id
        where ($1 = 'all' or a.status = $1)
        order by a.submitted_at desc`,
      [status],
    ),
  );
}

export async function applicationById(
  principal: Principal,
  id: string,
): Promise<PendingApplication | null> {
  return withPrincipal(principal, (tx) =>
    tx.maybeOne<PendingApplication>(
      `select a.id, a.user_id, u.full_name, u.email, u.phone, u.email_verified_at,
              a.class_applying_for, a.stream_preference,
              a.guardian_name, a.guardian_email, a.guardian_phone, a.guardian_relationship,
              a.submitted_at, a.status, a.date_of_birth, a.previous_school, a.home_address,
              a.gender, a.review_note, a.reviewed_at, a.student_profile_id,
              sp.admission_number,
              case when c.id is null then null
                   else palmseed_class_label(c.level, c.stream, c.arm) end as class_label
         from applications a
         join users u on u.id = a.user_id
         left join student_profiles sp on sp.user_id = u.id
         left join classes c on c.id = sp.class_id
        where a.id = $1`,
      [id],
    ),
  );
}

export interface StudentRow {
  user_id: string;
  profile_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  admission_number: string | null;
  class_label: string | null;
  class_id: string | null;
  guardian_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  created_at: Date;
  last_login_at: Date | null;
  email_verified_at: Date | null;
  date_of_birth: Date | null;
  admitted_on: Date | null;
  previous_school: string | null;
  home_address: string | null;
}

export interface StudentQuery {
  search?: string;
  status?: string;
  classId?: string;
  limit?: number;
}

export async function students(
  principal: Principal,
  query: StudentQuery = {},
): Promise<StudentRow[]> {
  const { search, status, classId, limit = 200 } = query;

  return withPrincipal(principal, (tx) =>
    tx.rows<StudentRow>(
      `select u.id as user_id, sp.id as profile_id, u.full_name, u.email, u.phone, u.status,
              sp.admission_number, sp.class_id, sp.date_of_birth, sp.admitted_on,
              sp.previous_school, sp.home_address,
              case when c.id is null then null
                   else palmseed_class_label(c.level, c.stream, c.arm) end as class_label,
              g.full_name as guardian_name, g.email as guardian_email, g.phone as guardian_phone,
              u.created_at, u.last_login_at, u.email_verified_at
         from users u
         left join student_profiles sp on sp.user_id = u.id
         left join classes c           on c.id = sp.class_id
         left join guardian_profiles g on g.student_profile_id = sp.id and g.is_primary
        where u.role = 'student'
          and ($1::text is null or (
                u.full_name ilike '%' || $1 || '%'
             or u.email ilike '%' || $1 || '%'
             or coalesce(sp.admission_number, '') ilike '%' || $1 || '%'
             or coalesce(g.full_name, '') ilike '%' || $1 || '%'
          ))
          and ($2::text is null or u.status = $2)
          and ($3::uuid is null or sp.class_id = $3)
        order by u.created_at desc
        limit $4`,
      [search || null, status || null, classId || null, limit],
    ),
  );
}

export async function studentByUserId(
  principal: Principal,
  userId: string,
): Promise<StudentRow | null> {
  const rows = await withPrincipal(principal, (tx) =>
    tx.rows<StudentRow>(
      `select u.id as user_id, sp.id as profile_id, u.full_name, u.email, u.phone, u.status,
              sp.admission_number, sp.class_id, sp.date_of_birth, sp.admitted_on,
              sp.previous_school, sp.home_address,
              case when c.id is null then null
                   else palmseed_class_label(c.level, c.stream, c.arm) end as class_label,
              g.full_name as guardian_name, g.email as guardian_email, g.phone as guardian_phone,
              u.created_at, u.last_login_at, u.email_verified_at
         from users u
         left join student_profiles sp on sp.user_id = u.id
         left join classes c           on c.id = sp.class_id
         left join guardian_profiles g on g.student_profile_id = sp.id and g.is_primary
        where u.id = $1 and u.role = 'student'`,
      [userId],
    ),
  );
  return rows[0] ?? null;
}

export interface ClassOption {
  id: string;
  label: string;
  level: string;
  stream: string | null;
}

export async function classOptions(principal: Principal): Promise<ClassOption[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<ClassOption>(
      `select id, palmseed_class_label(level, stream, arm) as label, level, stream
         from classes
        order by level, stream nulls first, arm`,
    ),
  );
}

export interface SessionOption {
  id: string;
  name: string;
  is_current: boolean;
  starts_on: Date;
}

export async function sessionOptions(principal: Principal): Promise<SessionOption[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<SessionOption>(
      'select id, name, is_current, starts_on from academic_sessions order by starts_on desc',
    ),
  );
}

export interface TeacherRow {
  teacher_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  staff_number: string;
  qualification: string | null;
  specialism: string | null;
  status: string;
  assignment_count: number;
  last_login_at: Date | null;
}

export async function teachers(principal: Principal): Promise<TeacherRow[]> {
  const rows = await withPrincipal(principal, (tx) =>
    tx.rows<Omit<TeacherRow, 'assignment_count'> & { assignment_count: string }>(
      `select t.id as teacher_id, u.id as user_id, u.full_name, u.email, u.phone, u.status,
              t.staff_number, t.qualification, t.specialism, u.last_login_at,
              (select count(*) from teacher_assignments ta where ta.teacher_id = t.id) as assignment_count
         from teachers t
         join users u on u.id = t.user_id
        order by u.full_name`,
    ),
  );

  return rows.map((row) => ({ ...row, assignment_count: Number(row.assignment_count) }));
}

export interface EmailLogRow {
  id: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  template: string;
  status: string;
  error: string | null;
  created_at: Date;
  sent_at: Date | null;
}

export async function emailLogs(principal: Principal, limit = 80): Promise<EmailLogRow[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<EmailLogRow>(
      `select id, to_email, to_name, subject, template, status, error, created_at, sent_at
         from email_logs
        order by created_at desc
        limit $1`,
      [limit],
    ),
  );
}

export interface AuditRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string | null;
  created_at: Date;
  actor_name: string | null;
  actor_role: string | null;
}

export async function auditLogs(principal: Principal, limit = 60): Promise<AuditRow[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<AuditRow>(
      `select a.id, a.action, a.entity_type, a.entity_id, a.summary, a.created_at,
              a.actor_role, u.full_name as actor_name
         from audit_logs a
         left join users u on u.id = a.actor_user_id
        order by a.created_at desc
        limit $1`,
      [limit],
    ),
  );
}

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  audience: string;
  class_label: string | null;
  published_at: Date | null;
  is_pinned: boolean;
  created_at: Date;
}

export async function adminAnnouncements(principal: Principal): Promise<AnnouncementRow[]> {
  return withPrincipal(principal, (tx) =>
    tx.rows<AnnouncementRow>(
      `select a.id, a.title, a.body, a.audience, a.published_at, a.is_pinned, a.created_at,
              case when c.id is null then null
                   else palmseed_class_label(c.level, c.stream, c.arm) end as class_label
         from announcements a
         left join classes c on c.id = a.class_id
        order by a.created_at desc
        limit 60`,
    ),
  );
}
