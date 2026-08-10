-- ---------------------------------------------------------------------------
-- 0002 academic structure
-- Sessions, terms, classes, subjects and teaching staff.
-- Nigerian secondary structure: JSS 1 to JSS 3, SS 1 to SS 3, with Science,
-- Art and Commercial pathways in the senior school.
-- ---------------------------------------------------------------------------

create table academic_sessions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,          -- for example 2025/2026
  starts_on  date not null,
  ends_on    date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  constraint academic_sessions_range check (ends_on > starts_on)
);

-- At most one current session.
create unique index academic_sessions_single_current
  on academic_sessions ((is_current)) where is_current;

create table terms (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references academic_sessions (id) on delete cascade,
  name       text not null check (name in ('First Term', 'Second Term', 'Third Term')),
  starts_on  date not null,
  ends_on    date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, name),
  constraint terms_range check (ends_on > starts_on)
);

create unique index terms_single_current on terms ((is_current)) where is_current;
create index terms_session_idx on terms (session_id);

create table classes (
  id         uuid primary key default gen_random_uuid(),
  level      text not null check (level in ('JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3')),
  arm        text not null default 'A' check (arm ~ '^[A-Z]$'),
  stream     text check (stream in ('Science', 'Art', 'Commercial')),
  capacity   smallint check (capacity is null or capacity > 0),
  created_at timestamptz not null default now(),

  -- Streams belong to the senior school only.
  constraint classes_stream_rule check (
    (level like 'JSS%' and stream is null) or level like 'SS%'
  ),
  unique (level, arm, stream)
);

-- Human readable label, for example "SS 2 Science A".
create or replace function palmseed_class_label(p_level text, p_stream text, p_arm text)
  returns text language sql immutable
  as $$ select btrim(p_level || coalesce(' ' || p_stream, '') || ' ' || p_arm) $$;

create table subjects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  code       text not null unique,
  department text check (department in ('Science', 'Art', 'Commercial', 'General')),
  created_at timestamptz not null default now()
);

-- Which subjects are offered to which level and stream.
create table class_subjects (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes (id) on delete cascade,
  subject_id uuid not null references subjects (id) on delete cascade,
  is_core    boolean not null default true,
  unique (class_id, subject_id)
);

-- ---------------------------------------------------------------------------
-- teachers
-- Teacher accounts are always created by an administrator. There is no public
-- route that can produce a row here.
-- ---------------------------------------------------------------------------
create table teachers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references users (id) on delete cascade,
  staff_number  text not null unique,
  qualification text,
  specialism    text,
  hired_on      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger teachers_touch before update on teachers
  for each row execute function palmseed_touch_updated_at();

-- A teacher may only reach the classes and subjects listed here.
create table teacher_assignments (
  id              uuid primary key default gen_random_uuid(),
  teacher_id      uuid not null references teachers (id) on delete cascade,
  class_id        uuid not null references classes (id) on delete cascade,
  subject_id      uuid references subjects (id) on delete cascade,
  session_id      uuid not null references academic_sessions (id) on delete cascade,
  is_form_teacher boolean not null default false,
  created_at      timestamptz not null default now()
);

-- One row per teacher, class, subject and session. Subject is null for a form
-- teacher assignment, so two partial indexes are used instead of one unique
-- constraint over a nullable column.
create unique index teacher_assignments_subject_unique
  on teacher_assignments (teacher_id, class_id, subject_id, session_id)
  where subject_id is not null;

create unique index teacher_assignments_form_unique
  on teacher_assignments (teacher_id, class_id, session_id)
  where subject_id is null;

create index teacher_assignments_teacher_idx on teacher_assignments (teacher_id, session_id);
create index teacher_assignments_class_idx on teacher_assignments (class_id, session_id);
