# Palmseed Model School

Public website and school portal for Palmseed Model School, Nigeria.
Motto: Always Useful.

Next.js 16 App Router, TypeScript, Tailwind CSS 4, GSAP, PostgreSQL with row
level security, Resend for transactional email.

---

## What is here

| Area | Route | Notes |
| --- | --- | --- |
| Public website | `/`, `/about`, `/academics`, `/admissions`, `/school-life`, `/news`, `/contact`, `/privacy`, `/portal-terms` | Cinematic hero, gravity vortex transition into the portal |
| Registration | `/signup`, `/signup/details` | Two steps: account, then admission details and guardian consent |
| Sign in | `/signin` | Email address or admission number |
| Recovery | `/forgot-password` | Six digit code, ten minute expiry, single use |
| Activation | `/activate` | For accounts the school creates, teachers and existing students |
| Student portal | `/dashboard` and eight sections | Limited while Pending Review, full once approved |
| Teacher portal | `/teacher` | Assigned classes and subjects only |
| Administrator | `/admin` and nine sections | Approvals, records, email, security, audit |

---

## Running it locally

You need Node 20.9 or newer and a PostgreSQL 14 or newer database.

```bash
npm install
cp .env.example .env.local     # then fill in DATABASE_URL and SESSION_SECRET
npm run db:migrate             # applies db/migrations in order
npm run admin:create           # creates the administrator account
npm run dev
```

The application connects as the `palmseed_app` role, which migration `0006`
creates. That role deliberately does **not** hold `BYPASSRLS`, so the row level
security policies actually apply to it. Point `DATABASE_URL` at that role and
`MIGRATION_DATABASE_URL` at an owner role.

```
DATABASE_URL=postgresql://palmseed_app:<password>@host:5432/palmseed
MIGRATION_DATABASE_URL=postgresql://postgres:<password>@host:5432/palmseed
```

Set the role password once after the first migration:

```sql
alter role palmseed_app with password '<a long random value>';
```

### Photography

The photographs are declared in `src/lib/media.ts` and stored locally, never
hotlinked. Download them with:

```bash
npm run media:fetch
```

Until they are present each slot renders a composed brand panel rather than a
broken image, so the site is complete either way. These are licensed stock
photographs used to illustrate the site. They are not presented as Palmseed
students, and the footer credit says so. Replace them with the school's own
photography by dropping files in at the same paths.

### The logo

`public/brand/palmseed-logo.svg` is currently a plain placeholder monogram, not
the school mark, because the official artwork was not supplied with this build.
See `public/brand/README.md` for how to install the real one. No code changes
are needed.

---

## Checks

```bash
npm run lint        # ESLint, zero warnings allowed
npm run typecheck   # tsc --noEmit, strict
npm test            # Vitest, unit plus integration against a real database
npm run test:e2e    # Playwright, desktop and Android viewports
npm run build       # production build
npm run verify      # all of the above except e2e
```

The integration tests run against a real PostgreSQL instance and prove the
security policies hold, rather than mocking them away. The end to end tests run
against the production build with nothing stubbed.

Three end to end projects run:

| Project | What it is for |
| --- | --- |
| `desktop-windows` | 1440 by 900, the common Windows desktop |
| `small-screen` | 412 pixels wide with no device emulation. This is the project that proves the responsive layout, and the one to trust when the two disagree. |
| `android-phone` | Full Pixel 7 emulation including touch. Its viewport metrics depend on the Chromium build matching the Playwright version, so a failure that appears only here is suspect until it reproduces in `small-screen`. |

---

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full runbook: environment
variables, Supabase setup, Resend domain verification, the administrator
bootstrap and the launch checklist.

---

## Design notes

### Security

- Passwords are hashed with scrypt at `N = 32768`, about 32 MB per hash.
- Sessions are opaque random tokens. Only the SHA-256 digest is stored, so a
  database disclosure hands over nothing replayable.
- Session cookies are `httpOnly`, `secure` in production and `sameSite=lax`.
  No authentication token is ever placed in local storage.
- CSRF uses the synchroniser token pattern plus an origin check on every
  mutating route.
- Rate limits live in the database, so they hold across serverless instances
  rather than per process.
- Reset codes are six digits, keyed hashed, single use, expire after ten
  minutes, allow five wrong attempts and are cancelled by a newer request.
- A password change revokes every other session and emails the account holder.
- Network addresses are never stored in readable form. Only a keyed hash and a
  coarse region label supplied by the edge are kept.
- Row level security is enabled **and forced** on every table. A student sees
  exactly one user row. A teacher reaches only assigned classes. Unpublished
  results are invisible to the student they belong to.

### Honesty about data

Nothing is seeded. No fake students, teachers, results or fees exist anywhere
in this repository. Every count in the administrator dashboard is a real query,
which is why a fresh installation reads zero. Where the school has not supplied
something, such as the street address or the telephone number, the interface
hides the row rather than inventing a value.

### Writing rule

Visible text avoids hyphens, en dashes and em dashes, using commas, full stops
and separate sentences instead. A test in `tests/unit/content.test.ts` enforces
this across the page and component sources. Source code, routes, file names and
environment variables use normal syntax.
