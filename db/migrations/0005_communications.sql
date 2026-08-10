-- ---------------------------------------------------------------------------
-- 0005 communications
-- Announcements, internal messages and the email delivery ledger.
-- ---------------------------------------------------------------------------

create table announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  audience     text not null default 'public'
                 check (audience in ('public', 'students', 'guardians', 'teachers', 'class')),
  class_id     uuid references classes (id) on delete cascade,
  is_pinned    boolean not null default false,
  published_at timestamptz,
  author_id    uuid references users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- A class announcement must name the class it belongs to.
  constraint announcements_class_rule check (
    (audience = 'class' and class_id is not null)
    or (audience <> 'class' and class_id is null)
  )
);

create index announcements_public_idx on announcements (published_at desc)
  where audience = 'public' and published_at is not null;
create index announcements_audience_idx on announcements (audience, published_at desc);

create trigger announcements_touch before update on announcements
  for each row execute function palmseed_touch_updated_at();

-- ---------------------------------------------------------------------------
-- messages
-- Internal portal messages between staff and students or guardians.
-- ---------------------------------------------------------------------------
create table messages (
  id                uuid primary key default gen_random_uuid(),
  sender_user_id    uuid references users (id) on delete set null,
  recipient_user_id uuid not null references users (id) on delete cascade,
  subject           text not null,
  body              text not null,
  read_at           timestamptz,
  parent_message_id uuid references messages (id) on delete set null,
  created_at        timestamptz not null default now()
);

create index messages_recipient_idx on messages (recipient_user_id, created_at desc);
create index messages_unread_idx on messages (recipient_user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- email_logs
-- Every message the platform attempts to send is recorded here first, so the
-- administrator dashboard can show a truthful delivery history.
--
-- status values
--   queued    row written, provider call not finished
--   sent      provider accepted the message
--   failed    provider rejected the message, error holds the reason
--   simulated no RESEND_API_KEY configured, message rendered but not sent
-- ---------------------------------------------------------------------------
create table email_logs (
  id             uuid primary key default gen_random_uuid(),
  to_email       text not null,
  to_name        text,
  reply_to       text,
  subject        text not null,
  template       text not null,
  status         text not null default 'queued'
                   check (status in ('queued', 'sent', 'failed', 'simulated')),
  provider_id    text,
  error          text,
  related_user_id uuid references users (id) on delete set null,
  campaign_id    uuid,
  created_by     uuid references users (id) on delete set null,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  sent_at        timestamptz
);

create index email_logs_created_idx on email_logs (created_at desc);
create index email_logs_status_idx on email_logs (status, created_at desc);
create index email_logs_recipient_idx on email_logs (lower(to_email));
create index email_logs_campaign_idx on email_logs (campaign_id) where campaign_id is not null;

-- Groups the individual sends produced by one administrator composer action.
create table email_campaigns (
  id           uuid primary key default gen_random_uuid(),
  subject      text not null,
  body         text not null,
  audience     text not null check (audience in (
                 'student', 'guardian', 'class', 'all_students', 'all_guardians', 'students_and_guardians'
               )),
  class_id     uuid references classes (id) on delete set null,
  target_user_id uuid references users (id) on delete set null,
  recipient_count integer not null default 0,
  created_by   uuid references users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index email_campaigns_created_idx on email_campaigns (created_at desc);
