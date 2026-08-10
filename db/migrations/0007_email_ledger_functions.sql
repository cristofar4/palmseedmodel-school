-- ---------------------------------------------------------------------------
-- 0007 email ledger write path
--
-- The ledger is deliberately readable by administrators only. That created a
-- problem for the code that writes it.
--
-- Verification links, password reset codes and contact acknowledgements are
-- all sent by the authenticator principal, before any account exists. Under
-- row level security that principal cannot read email_logs, and PostgreSQL
-- applies the SELECT policies to any statement that references a column,
-- which covers `insert ... returning id` and `update ... where id = $1`.
-- Both therefore failed.
--
-- Widening the read policy would let the whole ledger be read by a principal
-- that has no business seeing it. Instead the two operations the write path
-- actually needs are exposed as security definer functions. They append a row
-- and settle its delivery status, and they cannot be used to read anything
-- back out.
-- ---------------------------------------------------------------------------

create or replace function palmseed_log_email(
  p_id             uuid,
  p_to             text,
  p_to_name        text,
  p_reply_to       text,
  p_subject        text,
  p_template       text,
  p_related_user   uuid,
  p_created_by     uuid,
  p_campaign       uuid,
  p_metadata       jsonb
) returns void
  language sql
  security definer
  set search_path = public, pg_temp
  as $$
    insert into email_logs
      (id, to_email, to_name, reply_to, subject, template, status,
       related_user_id, created_by, campaign_id, metadata)
    values
      (p_id, lower(p_to), p_to_name, p_reply_to, p_subject, p_template, 'queued',
       p_related_user, p_created_by, p_campaign, coalesce(p_metadata, '{}'::jsonb))
  $$;

-- Records the outcome of the provider call. The status values are constrained
-- by the table itself, so an unexpected value is rejected here as well.
create or replace function palmseed_settle_email(
  p_id          uuid,
  p_status      text,
  p_provider_id text,
  p_error       text
) returns void
  language sql
  security definer
  set search_path = public, pg_temp
  as $$
    update email_logs
       set status      = p_status,
           provider_id = p_provider_id,
           error       = p_error,
           sent_at     = case when p_status in ('sent', 'simulated') then now() else null end
     where id = p_id
  $$;

revoke execute on function palmseed_log_email(uuid, text, text, text, text, text, uuid, uuid, uuid, jsonb) from public;
revoke execute on function palmseed_settle_email(uuid, text, text, text) from public;

grant execute on function palmseed_log_email(uuid, text, text, text, text, text, uuid, uuid, uuid, jsonb) to palmseed_app;
grant execute on function palmseed_settle_email(uuid, text, text, text) to palmseed_app;
