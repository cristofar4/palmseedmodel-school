-- ---------------------------------------------------------------------------
-- 0006 row level security
--
-- The application connects as palmseed_app, a role that does NOT hold
-- BYPASSRLS. At the start of every transaction the request principal is set
-- with SET LOCAL palmseed.user_id and SET LOCAL palmseed.role, and the
-- policies below are evaluated against it.
--
-- This is defence in depth. It does not replace authorisation checks in the
-- application layer, it catches the case where one of those checks is missing
-- or a query forgets a predicate.
-- ---------------------------------------------------------------------------

-- --- runtime role ----------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'palmseed_app') then
    create role palmseed_app login;
  end if;
end
$$;

grant usage on schema public to palmseed_app;
grant select, insert, update, delete on all tables in schema public to palmseed_app;
grant usage, select on all sequences in schema public to palmseed_app;
grant execute on all functions in schema public to palmseed_app;

alter default privileges in schema public
  grant select, insert, update, delete on tables to palmseed_app;
alter default privileges in schema public
  grant usage, select on sequences to palmseed_app;

-- --- principal helpers -----------------------------------------------------
-- These read tables that are themselves protected, so they run as the definer
-- to avoid recursive policy evaluation. Each one takes no caller supplied
-- input beyond the request principal and pins its search path.

create or replace function palmseed_current_student_profile_id()
  returns uuid
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    select sp.id from student_profiles sp
    where sp.user_id = palmseed_current_user_id()
    limit 1
  $$;

create or replace function palmseed_current_teacher_id()
  returns uuid
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    select t.id from teachers t
    where t.user_id = palmseed_current_user_id()
    limit 1
  $$;

-- True when the signed in teacher is assigned to this class in any session.
create or replace function palmseed_teaches_class(p_class_id uuid)
  returns boolean
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    select exists (
      select 1 from teacher_assignments ta
      where ta.class_id = p_class_id
        and ta.teacher_id = palmseed_current_teacher_id()
    )
  $$;

-- True when the signed in teacher may touch this class and subject pair.
create or replace function palmseed_teaches_class_subject(p_class_id uuid, p_subject_id uuid)
  returns boolean
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    select exists (
      select 1 from teacher_assignments ta
      where ta.class_id = p_class_id
        and ta.teacher_id = palmseed_current_teacher_id()
        and (ta.subject_id = p_subject_id or ta.subject_id is null)
    )
  $$;

-- True when the given student sits in a class the signed in teacher handles.
create or replace function palmseed_teaches_student(p_student_profile_id uuid)
  returns boolean
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    select exists (
      select 1
      from student_profiles sp
      join teacher_assignments ta on ta.class_id = sp.class_id
      where sp.id = p_student_profile_id
        and ta.teacher_id = palmseed_current_teacher_id()
    )
  $$;

revoke execute on function palmseed_current_student_profile_id() from public;
revoke execute on function palmseed_current_teacher_id() from public;
revoke execute on function palmseed_teaches_class(uuid) from public;
revoke execute on function palmseed_teaches_class_subject(uuid, uuid) from public;
revoke execute on function palmseed_teaches_student(uuid) from public;

grant execute on function palmseed_current_student_profile_id() to palmseed_app;
grant execute on function palmseed_current_teacher_id() to palmseed_app;
grant execute on function palmseed_teaches_class(uuid) to palmseed_app;
grant execute on function palmseed_teaches_class_subject(uuid, uuid) to palmseed_app;
grant execute on function palmseed_teaches_student(uuid) to palmseed_app;

-- --- enable and force ------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'email_verification_tokens', 'auth_sessions', 'password_reset_codes',
    'auth_events', 'audit_logs', 'rate_limits', 'app_settings',
    'academic_sessions', 'terms', 'classes', 'subjects', 'class_subjects',
    'teachers', 'teacher_assignments',
    'student_profiles', 'guardian_profiles', 'applications', 'student_enrolments',
    'admission_number_counters',
    'timetables', 'attendance', 'assignments', 'assignment_submissions',
    'results', 'term_remarks', 'fees',
    'announcements', 'messages', 'email_logs', 'email_campaigns'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create policy users_admin_all on users
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy users_self_read on users
  for select using (id = palmseed_current_user_id());

create policy users_self_update on users
  for update using (id = palmseed_current_user_id())
  with check (id = palmseed_current_user_id());

create policy users_teacher_read_own_students on users
  for select using (
    palmseed_current_role() = 'teacher'
    and exists (
      select 1 from student_profiles sp
      where sp.user_id = users.id and palmseed_teaches_student(sp.id)
    )
  );

-- Sign in has to find an account before a principal exists. The lookup runs in
-- a transaction where palmseed.role is 'authenticator', which can read only
-- the columns the credential check needs and nothing else.
create policy users_authenticator_read on users
  for select using (palmseed_current_role() = 'authenticator');

-- Public signup creates the account before any principal is established.
create policy users_authenticator_insert on users
  for insert with check (palmseed_current_role() = 'authenticator' and role = 'student');

create policy users_authenticator_update on users
  for update using (palmseed_current_role() = 'authenticator')
  with check (palmseed_current_role() = 'authenticator');

-- ---------------------------------------------------------------------------
-- session, verification and reset material
-- Only the authenticator principal and the owning account may touch these.
-- ---------------------------------------------------------------------------
create policy auth_sessions_owner on auth_sessions
  for all using (
    user_id = palmseed_current_user_id() or palmseed_current_role() = 'authenticator'
  ) with check (
    user_id = palmseed_current_user_id() or palmseed_current_role() = 'authenticator'
  );

create policy auth_sessions_admin_read on auth_sessions
  for select using (palmseed_is_admin());

create policy email_verification_authenticator on email_verification_tokens
  for all using (
    user_id = palmseed_current_user_id() or palmseed_current_role() = 'authenticator'
  ) with check (
    user_id = palmseed_current_user_id() or palmseed_current_role() = 'authenticator'
  );

create policy password_reset_authenticator on password_reset_codes
  for all using (palmseed_current_role() = 'authenticator')
  with check (palmseed_current_role() = 'authenticator');

-- ---------------------------------------------------------------------------
-- security telemetry
-- Written by the authenticator, read by administrators. Never readable by a
-- student or teacher, because it spans every account.
-- ---------------------------------------------------------------------------
create policy auth_events_write on auth_events
  for insert with check (
    palmseed_current_role() in ('authenticator', 'admin')
    or palmseed_current_user_id() is not null
  );

create policy auth_events_admin_read on auth_events
  for select using (palmseed_is_admin());

create policy auth_events_self_read on auth_events
  for select using (user_id = palmseed_current_user_id());

create policy audit_logs_write on audit_logs
  for insert with check (palmseed_current_user_id() is not null or palmseed_current_role() = 'authenticator');

create policy audit_logs_admin_read on audit_logs
  for select using (palmseed_is_admin());

-- Rate limiting must work before anyone is authenticated.
create policy rate_limits_open on rate_limits
  for all using (true) with check (true);

create policy app_settings_read on app_settings
  for select using (true);

create policy app_settings_admin_write on app_settings
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

-- ---------------------------------------------------------------------------
-- academic structure
-- Readable by any signed in principal, and by the public site for the class
-- list. Only administrators may change it.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['academic_sessions', 'terms', 'classes', 'subjects', 'class_subjects']
  loop
    execute format('create policy %I_read on %I for select using (true)', t, t);
    execute format(
      'create policy %I_admin_write on %I for all using (palmseed_is_admin()) with check (palmseed_is_admin())',
      t, t
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- teachers
-- ---------------------------------------------------------------------------
create policy teachers_admin_all on teachers
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy teachers_self_read on teachers
  for select using (user_id = palmseed_current_user_id());

create policy teachers_authenticator_read on teachers
  for select using (palmseed_current_role() = 'authenticator');

create policy teacher_assignments_admin_all on teacher_assignments
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy teacher_assignments_self_read on teacher_assignments
  for select using (teacher_id = palmseed_current_teacher_id());

-- ---------------------------------------------------------------------------
-- student profiles and guardians
-- A student sees exactly one row, their own.
-- ---------------------------------------------------------------------------
create policy student_profiles_admin_all on student_profiles
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy student_profiles_self_read on student_profiles
  for select using (user_id = palmseed_current_user_id());

create policy student_profiles_self_update on student_profiles
  for update using (user_id = palmseed_current_user_id())
  with check (user_id = palmseed_current_user_id());

create policy student_profiles_teacher_read on student_profiles
  for select using (palmseed_teaches_student(id));

create policy student_profiles_authenticator on student_profiles
  for all using (palmseed_current_role() = 'authenticator')
  with check (palmseed_current_role() = 'authenticator');

create policy guardian_profiles_admin_all on guardian_profiles
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy guardian_profiles_student_read on guardian_profiles
  for select using (student_profile_id = palmseed_current_student_profile_id());

create policy guardian_profiles_teacher_read on guardian_profiles
  for select using (palmseed_teaches_student(student_profile_id));

create policy guardian_profiles_authenticator on guardian_profiles
  for all using (palmseed_current_role() = 'authenticator')
  with check (palmseed_current_role() = 'authenticator');

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
create policy applications_admin_all on applications
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy applications_owner_read on applications
  for select using (user_id = palmseed_current_user_id());

create policy applications_owner_write on applications
  for insert with check (user_id = palmseed_current_user_id());

create policy applications_authenticator on applications
  for all using (palmseed_current_role() = 'authenticator')
  with check (palmseed_current_role() = 'authenticator');

create policy student_enrolments_admin_all on student_enrolments
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy student_enrolments_self_read on student_enrolments
  for select using (student_profile_id = palmseed_current_student_profile_id());

create policy student_enrolments_teacher_read on student_enrolments
  for select using (palmseed_teaches_class(class_id));

create policy admission_counter_admin on admission_number_counters
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

-- ---------------------------------------------------------------------------
-- timetable
-- ---------------------------------------------------------------------------
create policy timetables_admin_all on timetables
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy timetables_student_read on timetables
  for select using (
    class_id = (select sp.class_id from student_profiles sp
                where sp.id = palmseed_current_student_profile_id())
  );

create policy timetables_teacher_read on timetables
  for select using (palmseed_teaches_class(class_id));

-- ---------------------------------------------------------------------------
-- attendance
-- ---------------------------------------------------------------------------
create policy attendance_admin_all on attendance
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy attendance_student_read on attendance
  for select using (student_profile_id = palmseed_current_student_profile_id());

create policy attendance_teacher_read on attendance
  for select using (palmseed_teaches_class(class_id));

create policy attendance_teacher_write on attendance
  for insert with check (palmseed_teaches_class(class_id));

create policy attendance_teacher_update on attendance
  for update using (palmseed_teaches_class(class_id))
  with check (palmseed_teaches_class(class_id));

-- ---------------------------------------------------------------------------
-- assignments
-- ---------------------------------------------------------------------------
create policy assignments_admin_all on assignments
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy assignments_teacher_manage on assignments
  for all using (palmseed_teaches_class_subject(class_id, subject_id))
  with check (palmseed_teaches_class_subject(class_id, subject_id));

-- Students only ever see published work for their own class.
create policy assignments_student_read on assignments
  for select using (
    published_at is not null
    and class_id = (select sp.class_id from student_profiles sp
                    where sp.id = palmseed_current_student_profile_id())
  );

create policy submissions_admin_all on assignment_submissions
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy submissions_student_own on assignment_submissions
  for all using (student_profile_id = palmseed_current_student_profile_id())
  with check (student_profile_id = palmseed_current_student_profile_id());

create policy submissions_teacher_read on assignment_submissions
  for select using (palmseed_teaches_student(student_profile_id));

create policy submissions_teacher_grade on assignment_submissions
  for update using (palmseed_teaches_student(student_profile_id))
  with check (palmseed_teaches_student(student_profile_id));

-- ---------------------------------------------------------------------------
-- results
-- A student may only read results that have been published.
-- ---------------------------------------------------------------------------
create policy results_admin_all on results
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy results_student_read on results
  for select using (
    student_profile_id = palmseed_current_student_profile_id()
    and published_at is not null
  );

create policy results_teacher_manage on results
  for all using (palmseed_teaches_class_subject(class_id, subject_id))
  with check (palmseed_teaches_class_subject(class_id, subject_id));

create policy term_remarks_admin_all on term_remarks
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy term_remarks_student_read on term_remarks
  for select using (
    student_profile_id = palmseed_current_student_profile_id()
    and published_at is not null
  );

create policy term_remarks_teacher_manage on term_remarks
  for all using (palmseed_teaches_student(student_profile_id))
  with check (palmseed_teaches_student(student_profile_id));

-- ---------------------------------------------------------------------------
-- fees
-- Financial records are administrator managed and student readable only.
-- ---------------------------------------------------------------------------
create policy fees_admin_all on fees
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy fees_student_read on fees
  for select using (student_profile_id = palmseed_current_student_profile_id());

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------
create policy announcements_admin_all on announcements
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy announcements_public_read on announcements
  for select using (audience = 'public' and published_at is not null);

create policy announcements_student_read on announcements
  for select using (
    published_at is not null
    and palmseed_current_role() = 'student'
    and (
      audience in ('students', 'guardians')
      or (audience = 'class' and class_id = (
            select sp.class_id from student_profiles sp
            where sp.id = palmseed_current_student_profile_id()))
    )
  );

create policy announcements_teacher_read on announcements
  for select using (
    published_at is not null
    and palmseed_current_role() = 'teacher'
    and (audience in ('teachers', 'students') or (audience = 'class' and palmseed_teaches_class(class_id)))
  );

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create policy messages_admin_all on messages
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy messages_recipient_read on messages
  for select using (recipient_user_id = palmseed_current_user_id());

create policy messages_recipient_update on messages
  for update using (recipient_user_id = palmseed_current_user_id())
  with check (recipient_user_id = palmseed_current_user_id());

create policy messages_sender_read on messages
  for select using (sender_user_id = palmseed_current_user_id());

create policy messages_staff_send on messages
  for insert with check (
    sender_user_id = palmseed_current_user_id() and palmseed_is_staff()
  );

-- ---------------------------------------------------------------------------
-- email ledger
-- Administrator only. The authenticator may append, because verification and
-- reset mail is sent before a principal exists.
-- ---------------------------------------------------------------------------
create policy email_logs_admin_read on email_logs
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());

create policy email_logs_system_write on email_logs
  for insert with check (palmseed_current_role() in ('authenticator', 'admin', 'teacher'));

create policy email_logs_system_update on email_logs
  for update using (palmseed_current_role() in ('authenticator', 'admin', 'teacher'))
  with check (palmseed_current_role() in ('authenticator', 'admin', 'teacher'));

create policy email_campaigns_admin on email_campaigns
  for all using (palmseed_is_admin()) with check (palmseed_is_admin());
