# Deployment runbook

Palmseed Model School, from an empty Vercel project to a live site.

Nothing here needs a password or a private key to be typed into a chat. Every
secret is entered directly into the provider that needs it.

---

## 1. Create the database

Supabase, or any managed PostgreSQL 14 or newer.

1. Create a project. Choose a region close to Nigeria, `eu-west-1` or
   `eu-central-1` are usually the best available.
2. Copy the connection string from **Project Settings, Database, Connection
   string, URI**. Use the **Session pooler** on port 5432.
3. Keep two connection strings:
   - the owner string, used for migrations
   - a restricted application string, created in step 3

## 2. Apply the migrations

From a machine that can reach the database:

```bash
git clone <this repository>
cd palmseedmodel-school
npm install

export MIGRATION_DATABASE_URL='postgresql://postgres:<password>@<host>:5432/postgres?sslmode=require'
export DATABASE_URL="$MIGRATION_DATABASE_URL"

npm run db:migrate
```

The seven migrations are applied in order, each in its own transaction, and
recorded in `schema_migrations` with a checksum. Re running is safe. Editing an
applied migration is refused, so schema drift cannot go unnoticed.

Read them before you run them. They are plain SQL in `db/migrations`.

## 3. Lock down the application role

Migration `0006` creates the `palmseed_app` role. Give it a password and use it
for the running application. This is the step that makes row level security
meaningful: `palmseed_app` does not hold `BYPASSRLS`, so the policies apply to
it. The `postgres` owner role would bypass them.

```sql
alter role palmseed_app with password '<a long random value>';
```

The application connection string is then:

```
postgresql://palmseed_app:<that password>@<host>:5432/postgres?sslmode=require
```

## 4. Verify the sending domain in Resend

1. Sign in at <https://resend.com>, open **Domains**, add the school domain.
2. Add the DKIM, SPF and return path records it gives you to the DNS for that
   domain. Wait for it to report **Verified**.
3. Create an API key under **API Keys** with send permission.

`EMAIL_FROM` must be an address on the verified domain, for example
`Palmseed Model School <noreply@palmseedmodelschool.ng>`.

**Do not put `christopherpraise864@gmail.com` in `EMAIL_FROM`.** A Gmail
address cannot be verified as a sending domain, and sending as it would be
spoofing. It is already configured as the reply address and the administrator
notification address, which is the correct use for it. Replies to any school
email land there.

If the school domain is not ready on launch day, Resend's shared
`onboarding@resend.dev` sender works for testing, but it can only deliver to
the address that owns the Resend account. Treat that as a temporary state.

## 5. Configure Vercel

Import the repository at <https://vercel.com/new>. Framework detection picks up
Next.js with no changes needed.

Add these under **Settings, Environment Variables**, for Production and
Preview. Never commit them.

| Name | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | the `palmseed_app` string from step 3 | Must include `sslmode=require` |
| `SESSION_SECRET` | `openssl rand -base64 48` | Rotating it signs everyone out |
| `NEXT_PUBLIC_SITE_URL` | `https://<your domain>` | No trailing slash |
| `RESEND_API_KEY` | the key from step 4 | Leave unset to run without sending |
| `EMAIL_FROM` | `Palmseed Model School <noreply@your-verified-domain>` | Must be the verified domain |
| `EMAIL_REPLY_TO` | `christopherpraise864@gmail.com` | |
| `ADMIN_NOTIFICATION_EMAIL` | `christopherpraise864@gmail.com` | |

Optional, only for profile photograph and document uploads:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | the project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | the service role key, server side only |

The service role key must never be added to a variable whose name begins with
`NEXT_PUBLIC_`. Anything with that prefix is compiled into the browser bundle.

Then deploy. The first build takes two to three minutes.

## 6. Create the administrator account

Run once, from a machine with the database string, not from the browser:

```bash
export DATABASE_URL='postgresql://palmseed_app:<password>@<host>:5432/postgres?sslmode=require'
export MIGRATION_DATABASE_URL='postgresql://postgres:<password>@<host>:5432/postgres?sslmode=require'
export ADMIN_BOOTSTRAP_EMAIL='christopherpraise864@gmail.com'
export ADMIN_BOOTSTRAP_PASSWORD='<a long password you choose now>'
export ADMIN_BOOTSTRAP_NAME='Palmseed Administrator'

npm run admin:create
unset ADMIN_BOOTSTRAP_PASSWORD
```

The password is read from the environment, never from the command line, so it
does not land in shell history. The script prints a short fingerprint of it so
you can confirm which password was installed, and never the password itself.

To change it later, `npm run admin:create -- --reset-password`, which also
signs out every existing session on that account.

## 7. Set up the academic year

Sign in at `/signin` and go to **Academic setup**. In this order:

1. The academic session, for example `2026/2027`, marked current.
2. Its three terms, with the current one marked.
3. The classes the school runs. Junior classes take no pathway. Senior classes
   take Science, Art or Commercial.
4. The subjects taught.

An admission number is issued against a class and a session, so a registration
cannot be approved before at least one of each exists. The dashboard says so
rather than failing quietly.

Then create the teaching accounts under **Teachers**. Each one receives an
activation link and sets its own password. No password is ever emailed.

## 8. Verify email delivery

With `RESEND_API_KEY` set:

1. Send yourself a message from **Email** in the administrator dashboard.
2. Check **Delivery history** on the same page. It should read `sent`.
   `failed` shows the provider's reason next to it.
3. Register a test account at `/signup` and confirm three things arrive: the
   verification link to the applicant, the welcome message, and the new
   registration notice to `christopherpraise864@gmail.com`.
4. Approve or reject that test registration and confirm the decision email
   reaches both the student address and the guardian address.
5. Delete the test account under **Students** afterwards.

Without a key the platform runs in outbox mode. Messages are still validated,
rendered and recorded in the ledger with status `simulated`, and written to
`.mail-outbox/` locally. Nothing leaves the server. That is what the end to end
tests use, and it is why the flows can be exercised before DNS is ready.

## 9. Custom domain

**Settings, Domains** in Vercel, add the domain, follow the DNS instructions.
Update `NEXT_PUBLIC_SITE_URL` to match and redeploy, otherwise the links inside
emails will still point at the old address.

Until the domain is ready the site is live on the Vercel production address.

---

## Launch checklist

Work down this list. Every line is checkable in a browser.

- [ ] Migrations applied, `schema_migrations` holds seven rows
- [ ] `palmseed_app` has a password and `DATABASE_URL` uses it
- [ ] All required environment variables set in Vercel Production
- [ ] Production deploy is green
- [ ] `/` loads, the hero renders, no console errors
- [ ] The gravity vortex runs on a phone and on a desktop, and the reduced
      motion setting produces the plain presentation
- [ ] Administrator account created, sign in works at `/signin`
- [ ] Academic session, terms, at least one class and the subjects exist
- [ ] Teaching accounts created, activation emails received
- [ ] A test registration reaches Pending Review and appears in `/admin`
- [ ] The new registration email arrived at the administrator address
- [ ] Approval issues an admission number and emails student and guardian
- [ ] The approved student can sign in with the admission number
- [ ] Password reset delivers a six digit code and the code works
- [ ] A password change signs other devices out and sends the warning email
- [ ] `/admin` and `/teacher` refuse a student account
- [ ] CSV export downloads
- [ ] Test data removed
- [ ] `ADMIN_BOOTSTRAP_PASSWORD` removed from every environment

---

## Operating notes

**Sign in notifications.** On by default, every student sign in. Change it
under **Settings** to unusual sign ins only, or off. Sign ins are recorded in
the security log either way.

**Where to look when something is wrong.** `/admin/security` holds the
authentication activity, the failed attempts and the audit trail.
`/admin/email` holds every message the platform has attempted, with the
provider's error text on failures.

**Backups.** Supabase takes daily backups on paid plans. On the free plan, take
your own with `pg_dump` before any migration.

**Rotating `SESSION_SECRET`.** It derives the CSRF and reset code keys as well
as session material. Changing it signs everyone out and invalidates outstanding
reset codes. That is the correct response to a suspected compromise.
