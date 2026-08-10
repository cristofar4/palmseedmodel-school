-- ---------------------------------------------------------------------------
-- 0001 core identity
-- Accounts, server side sessions, security events and operational primitives.
-- ---------------------------------------------------------------------------

-- Request scoped principal. The application sets these with SET LOCAL at the
-- start of every transaction so row level security can evaluate them.
create or replace function palmseed_current_user_id() returns uuid
  language sql stable
  as $$ select nullif(current_setting('palmseed.user_id', true), '')::uuid $$;

create or replace function palmseed_current_role() returns text
  language sql stable
  as $$ select coalesce(nullif(current_setting('palmseed.role', true), ''), 'anonymous') $$;

create or replace function palmseed_is_admin() returns boolean
  language sql stable
  as $$ select palmseed_current_role() = 'admin' $$;

create or replace function palmseed_is_staff() returns boolean
  language sql stable
  as $$ select palmseed_current_role() in ('admin', 'teacher') $$;

-- Keeps updated_at honest without the application having to remember.
create or replace function palmseed_touch_updated_at() returns trigger
  language plpgsql
  as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table users (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  phone             text,
  full_name         text not null,
  password_hash     text not null,
  role              text not null default 'student'
                      check (role in ('student', 'teacher', 'admin')),
  status            text not null default 'pending_review'
                      check (status in ('pending_review', 'active', 'suspended', 'graduated', 'rejected')),
  email_verified_at timestamptz,
  last_login_at     timestamptz,
  must_change_password boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint users_email_format check (position('@' in email) > 1),
  constraint users_full_name_present check (length(btrim(full_name)) > 1)
);

-- Email is treated case insensitively. The application normalises to lower
-- case on write; this index guarantees it at the storage layer.
create unique index users_email_unique on users (lower(email));
create index users_role_status_idx on users (role, status);
create index users_created_at_idx on users (created_at desc);

create trigger users_touch before update on users
  for each row execute function palmseed_touch_updated_at();

-- ---------------------------------------------------------------------------
-- email_verification_tokens
-- ---------------------------------------------------------------------------
create table email_verification_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  token_hash  text not null,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create unique index email_verification_token_hash_idx on email_verification_tokens (token_hash);
create index email_verification_user_idx on email_verification_tokens (user_id, consumed_at);

-- ---------------------------------------------------------------------------
-- auth_sessions
-- Opaque tokens. Only the SHA-256 hash is stored, so a database disclosure
-- does not hand over usable session tokens.
-- ---------------------------------------------------------------------------
create table auth_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users (id) on delete cascade,
  token_hash   text not null,
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  user_agent   text,
  ip_hash      text,
  device_label text
);

create unique index auth_sessions_token_hash_idx on auth_sessions (token_hash);
create index auth_sessions_user_idx on auth_sessions (user_id, revoked_at, expires_at);

-- ---------------------------------------------------------------------------
-- password_reset_codes
-- Six digit codes, hashed, single use, attempt limited and superseded by any
-- newer request for the same account.
-- ---------------------------------------------------------------------------
create table password_reset_codes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users (id) on delete cascade,
  code_hash    text not null,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  invalidated_at timestamptz,
  attempts     smallint not null default 0 check (attempts >= 0),
  created_at   timestamptz not null default now(),
  ip_hash      text
);

create index password_reset_user_idx on password_reset_codes (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- auth_events
-- Every authentication relevant action. IP addresses are never stored in the
-- clear; only a keyed hash plus a coarse region label.
-- ---------------------------------------------------------------------------
create table auth_events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references users (id) on delete set null,
  email_attempted  text,
  event_type       text not null check (event_type in (
                      'signup',
                      'login_success',
                      'login_failed',
                      'logout',
                      'email_verification_sent',
                      'email_verified',
                      'password_reset_requested',
                      'password_reset_failed',
                      'password_changed',
                      'account_approved',
                      'account_rejected',
                      'account_suspended',
                      'account_activated'
                    )),
  account_status   text,
  admission_number text,
  ip_hash          text,
  ip_region        text,
  user_agent       text,
  device_type      text,
  browser          text,
  operating_system text,
  is_new_device    boolean not null default false,
  detail           jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index auth_events_created_idx on auth_events (created_at desc);
create index auth_events_user_idx on auth_events (user_id, created_at desc);
create index auth_events_type_idx on auth_events (event_type, created_at desc);

-- ---------------------------------------------------------------------------
-- audit_logs
-- Administrative and teacher mutations, for accountability.
-- ---------------------------------------------------------------------------
create table audit_logs (
  id             uuid primary key default gen_random_uuid(),
  actor_user_id  uuid references users (id) on delete set null,
  actor_role     text,
  action         text not null,
  entity_type    text not null,
  entity_id      text,
  summary        text,
  changes        jsonb not null default '{}'::jsonb,
  ip_hash        text,
  created_at     timestamptz not null default now()
);

create index audit_logs_created_idx on audit_logs (created_at desc);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- rate_limits
-- Database backed so limits hold across serverless instances.
-- ---------------------------------------------------------------------------
create table rate_limits (
  bucket       text primary key,
  hits         integer not null default 0,
  window_start timestamptz not null default now(),
  blocked_until timestamptz
);

-- ---------------------------------------------------------------------------
-- app_settings
-- Small key value store for administrator controlled behaviour, such as the
-- login notification mode.
-- ---------------------------------------------------------------------------
create table app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references users (id) on delete set null
);

insert into app_settings (key, value) values
  ('admin_login_notifications', '{"mode":"all"}'::jsonb)
  on conflict (key) do nothing;
