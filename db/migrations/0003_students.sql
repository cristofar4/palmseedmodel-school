-- ---------------------------------------------------------------------------
-- 0003 students
-- Applications, student profiles, guardians and enrolment history.
-- ---------------------------------------------------------------------------

create table student_profiles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references users (id) on delete cascade,
  admission_number   text unique,
  date_of_birth      date,
  gender             text check (gender in ('Male', 'Female')),
  class_id           uuid references classes (id) on delete set null,
  current_session_id uuid references academic_sessions (id) on delete set null,
  previous_school    text,
  home_address       text,
  photo_path         text,
  admitted_on        date,
  graduated_on       date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- An admission number is only ever issued at approval, together with a class.
  constraint student_admission_requires_class
    check (admission_number is null or class_id is not null)
);

create index student_profiles_class_idx on student_profiles (class_id);
create index student_profiles_admission_idx on student_profiles (admission_number);

create trigger student_profiles_touch before update on student_profiles
  for each row execute function palmseed_touch_updated_at();

create table guardian_profiles (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references student_profiles (id) on delete cascade,
  full_name          text not null,
  email              text not null,
  phone              text not null,
  relationship       text not null default 'Guardian'
                       check (relationship in ('Mother', 'Father', 'Guardian')),
  occupation         text,
  address            text,
  is_primary         boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index guardian_student_idx on guardian_profiles (student_profile_id);
create unique index guardian_primary_unique
  on guardian_profiles (student_profile_id) where is_primary;

create trigger guardian_profiles_touch before update on guardian_profiles
  for each row execute function palmseed_touch_updated_at();

-- ---------------------------------------------------------------------------
-- applications
-- The record a prospective student or guardian submits. Kept separate from the
-- student profile so the review trail survives approval.
-- ---------------------------------------------------------------------------
create table applications (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references users (id) on delete cascade,
  student_profile_id   uuid references student_profiles (id) on delete set null,
  class_applying_for   text not null
                         check (class_applying_for in ('JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3')),
  stream_preference    text check (stream_preference in ('Science', 'Art', 'Commercial')),
  date_of_birth        date not null,
  gender               text check (gender in ('Male', 'Female')),
  previous_school      text,
  guardian_name        text not null,
  guardian_email       text not null,
  guardian_phone       text not null,
  guardian_relationship text not null default 'Guardian'
                         check (guardian_relationship in ('Mother', 'Father', 'Guardian')),
  home_address         text,
  guardian_consent     boolean not null default false,
  terms_accepted_at    timestamptz,
  status               text not null default 'pending'
                         check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  review_note          text,
  reviewed_by          uuid references users (id) on delete set null,
  reviewed_at          timestamptz,
  submitted_at         timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- An application may not be submitted without consent and accepted terms.
  constraint applications_consent_required
    check (guardian_consent and terms_accepted_at is not null),
  -- Senior school applicants choose a pathway.
  constraint applications_stream_rule check (
    (class_applying_for like 'JSS%' and stream_preference is null)
    or class_applying_for like 'SS%'
  )
);

create index applications_status_idx on applications (status, submitted_at desc);
create index applications_user_idx on applications (user_id);

create trigger applications_touch before update on applications
  for each row execute function palmseed_touch_updated_at();

-- ---------------------------------------------------------------------------
-- student_enrolments
-- One row per student per session, so class history is preserved when a
-- student is promoted.
-- ---------------------------------------------------------------------------
create table student_enrolments (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references student_profiles (id) on delete cascade,
  class_id           uuid not null references classes (id) on delete cascade,
  session_id         uuid not null references academic_sessions (id) on delete cascade,
  enrolled_on        date not null default current_date,
  status             text not null default 'active'
                       check (status in ('active', 'completed', 'withdrawn')),
  created_at         timestamptz not null default now(),
  unique (student_profile_id, session_id)
);

create index student_enrolments_class_idx on student_enrolments (class_id, session_id);

-- ---------------------------------------------------------------------------
-- Admission number generation
-- Format: PMS/<session start year>/<zero padded sequence>
-- Sequence restarts each session and is allocated atomically.
-- ---------------------------------------------------------------------------
create table admission_number_counters (
  session_year integer primary key,
  last_value   integer not null default 0
);

create or replace function palmseed_next_admission_number(p_session_year integer)
  returns text
  language plpgsql
  as $$
declare
  v_next integer;
begin
  insert into admission_number_counters (session_year, last_value)
    values (p_session_year, 1)
  on conflict (session_year) do update
    set last_value = admission_number_counters.last_value + 1
  returning last_value into v_next;

  return 'PMS/' || p_session_year::text || '/' || lpad(v_next::text, 4, '0');
end;
$$;
