-- ---------------------------------------------------------------------------
-- 0004 academic records
-- Timetable, attendance, assignments, results and fees.
-- ---------------------------------------------------------------------------

create table timetables (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references classes (id) on delete cascade,
  session_id   uuid not null references academic_sessions (id) on delete cascade,
  day_of_week  smallint not null check (day_of_week between 1 and 5), -- Monday to Friday
  period_index smallint not null check (period_index between 1 and 12),
  starts_at    time not null,
  ends_at      time not null,
  subject_id   uuid references subjects (id) on delete set null,
  teacher_id   uuid references teachers (id) on delete set null,
  room         text,
  label        text, -- used for non teaching periods such as Break or Assembly
  created_at   timestamptz not null default now(),

  unique (class_id, session_id, day_of_week, period_index),
  constraint timetable_time_range check (ends_at > starts_at),
  constraint timetable_slot_content check (subject_id is not null or label is not null)
);

create index timetables_class_idx on timetables (class_id, session_id, day_of_week, period_index);

-- ---------------------------------------------------------------------------
-- attendance
-- ---------------------------------------------------------------------------
create table attendance (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references student_profiles (id) on delete cascade,
  class_id           uuid not null references classes (id) on delete cascade,
  session_id         uuid not null references academic_sessions (id) on delete cascade,
  term_id            uuid not null references terms (id) on delete cascade,
  attendance_date    date not null,
  status             text not null check (status in ('present', 'absent', 'late', 'excused')),
  note               text,
  recorded_by        uuid references users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  unique (student_profile_id, attendance_date),
  constraint attendance_not_future check (attendance_date <= current_date)
);

create index attendance_class_date_idx on attendance (class_id, attendance_date desc);
create index attendance_student_term_idx on attendance (student_profile_id, term_id);

create trigger attendance_touch before update on attendance
  for each row execute function palmseed_touch_updated_at();

-- ---------------------------------------------------------------------------
-- assignments
-- ---------------------------------------------------------------------------
create table assignments (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references classes (id) on delete cascade,
  subject_id   uuid not null references subjects (id) on delete cascade,
  teacher_id   uuid references teachers (id) on delete set null,
  session_id   uuid not null references academic_sessions (id) on delete cascade,
  term_id      uuid not null references terms (id) on delete cascade,
  title        text not null,
  instructions text not null,
  max_score    numeric(5, 2) not null default 100 check (max_score > 0),
  due_at       timestamptz not null,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index assignments_class_idx on assignments (class_id, term_id, due_at desc);

create trigger assignments_touch before update on assignments
  for each row execute function palmseed_touch_updated_at();

create table assignment_submissions (
  id                 uuid primary key default gen_random_uuid(),
  assignment_id      uuid not null references assignments (id) on delete cascade,
  student_profile_id uuid not null references student_profiles (id) on delete cascade,
  body               text,
  file_path          text,
  submitted_at       timestamptz not null default now(),
  score              numeric(5, 2) check (score is null or score >= 0),
  feedback           text,
  graded_by          uuid references users (id) on delete set null,
  graded_at          timestamptz,
  unique (assignment_id, student_profile_id)
);

create index assignment_submissions_student_idx on assignment_submissions (student_profile_id);

-- ---------------------------------------------------------------------------
-- results
-- Continuous assessment out of 40 and examination out of 60, which is the
-- common Nigerian secondary split. Total and grade are derived, never typed.
-- ---------------------------------------------------------------------------
create or replace function palmseed_grade(p_total numeric)
  returns text language sql immutable
  as $$
    select case
      when p_total is null then null
      when p_total >= 75 then 'A1'
      when p_total >= 70 then 'B2'
      when p_total >= 65 then 'B3'
      when p_total >= 60 then 'C4'
      when p_total >= 55 then 'C5'
      when p_total >= 50 then 'C6'
      when p_total >= 45 then 'D7'
      when p_total >= 40 then 'E8'
      else 'F9'
    end
  $$;

create table results (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references student_profiles (id) on delete cascade,
  class_id           uuid not null references classes (id) on delete cascade,
  subject_id         uuid not null references subjects (id) on delete cascade,
  session_id         uuid not null references academic_sessions (id) on delete cascade,
  term_id            uuid not null references terms (id) on delete cascade,
  ca_score           numeric(5, 2) check (ca_score between 0 and 40),
  exam_score         numeric(5, 2) check (exam_score between 0 and 60),
  total_score        numeric(5, 2)
                       generated always as (coalesce(ca_score, 0) + coalesce(exam_score, 0)) stored,
  grade              text
                       generated always as (
                         palmseed_grade(coalesce(ca_score, 0) + coalesce(exam_score, 0))
                       ) stored,
  teacher_remark     text,
  entered_by         uuid references users (id) on delete set null,
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  unique (student_profile_id, subject_id, term_id)
);

create index results_student_term_idx on results (student_profile_id, term_id);
create index results_class_subject_idx on results (class_id, subject_id, term_id);

create trigger results_touch before update on results
  for each row execute function palmseed_touch_updated_at();

-- Overall remark written once per student per term by the form teacher.
create table term_remarks (
  id                  uuid primary key default gen_random_uuid(),
  student_profile_id  uuid not null references student_profiles (id) on delete cascade,
  term_id             uuid not null references terms (id) on delete cascade,
  form_teacher_remark text,
  principal_remark    text,
  published_at        timestamptz,
  updated_at          timestamptz not null default now(),
  unique (student_profile_id, term_id)
);

create trigger term_remarks_touch before update on term_remarks
  for each row execute function palmseed_touch_updated_at();

-- ---------------------------------------------------------------------------
-- fees
-- Amounts are stored in kobo to avoid floating point money.
-- ---------------------------------------------------------------------------
create table fees (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references student_profiles (id) on delete cascade,
  session_id         uuid not null references academic_sessions (id) on delete cascade,
  term_id            uuid not null references terms (id) on delete cascade,
  description        text not null,
  amount_kobo        bigint not null check (amount_kobo >= 0),
  amount_paid_kobo   bigint not null default 0 check (amount_paid_kobo >= 0),
  due_on             date,
  status             text not null default 'unpaid'
                       check (status in ('unpaid', 'part_paid', 'paid', 'waived')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint fees_payment_bounds check (amount_paid_kobo <= amount_kobo)
);

create index fees_student_idx on fees (student_profile_id, term_id);

create trigger fees_touch before update on fees
  for each row execute function palmseed_touch_updated_at();
