-- ---------------------------------------------------------------------------
-- 0008 administrator provisioning
--
-- Creating a teaching account, or importing an enrolled student, writes an
-- activation token for an account other than the administrator's own. The
-- policy from migration 0001 only admitted the account holder or the
-- authenticator, so the whole transaction was refused and no teaching account
-- could be created.
--
-- Provisioning accounts is a core administrator responsibility, so the
-- administrator is added to the policy. The token is still write only from
-- their side in any practical sense: it is a random value they never see in
-- the interface, and it is consumed on first use.
-- ---------------------------------------------------------------------------

create policy email_verification_admin on email_verification_tokens
  for all
  using (palmseed_is_admin())
  with check (palmseed_is_admin());
