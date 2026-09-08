import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import type { Page } from '@playwright/test';

/** Loads .env.local so the helpers can reach the same database the app uses. */
function loadEnv(): void {
  for (const file of ['.env.local', '.env']) {
    const full = path.join(process.cwd(), file);
    if (!existsSync(full)) continue;
    for (const rawLine of readFileSync(full, 'utf8').split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

/**
 * Clears the rate limit buckets.
 *
 * The suite signs in far more often than a real person would, from one
 * address, so it trips the production limits partway through. Resetting the
 * bucket between tests keeps the limits at their real production values
 * instead of weakening them for the sake of the tests.
 */
export async function clearRateLimits(): Promise<void> {
  loadEnv();
  const connectionString = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) return;

  const needsSsl = /supabase|neon|render|railway|amazonaws/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  try {
    await client.connect();
    await client.query("select set_config('palmseed.role', 'admin', false)");
    await client.query('delete from rate_limits');
  } catch {
    // A missing database is reported by the tests themselves, not here.
  } finally {
    await client.end().catch(() => undefined);
  }
}

/** Signs out and waits until the browser is genuinely back on the public site. */
export async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out' }).click();
  // A glob such as '**/' would match the dashboard too, and the wait would
  // return before the sign out had actually happened.
  await page.waitForURL((url) => url.pathname === '/', { timeout: 20_000 });
}

/** A fresh, unique registration identity for one test run. */
export function newIdentity(tag: string) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    fullName: `Test ${tag} Student`,
    email: `e2e.${tag}.${stamp}@example.test`,
    phone: '08012345678',
    password: 'palm harbour 2026 kx',
    guardianName: 'Test Guardian',
    guardianEmail: `e2e.guardian.${tag}.${stamp}@example.test`,
    guardianPhone: '08087654321',
  };
}

/**
 * Reads the most recent message written to the local outbox for an address.
 *
 * With no RESEND_API_KEY configured the application renders every message and
 * writes it to .mail-outbox instead of sending it, which is what lets the end
 * to end tests follow a verification link or read a reset code.
 */
export function latestOutboxMessage(toEmail: string, template?: string): string | null {
  const dir = path.join(process.cwd(), '.mail-outbox');

  let files: string[];
  try {
    files = readdirSync(dir);
  } catch {
    return null;
  }

  const safeTo = toEmail.replace(/[^a-zA-Z0-9@._-]/g, '_');

  const matches = files
    .filter((file) => file.includes(safeTo))
    .filter((file) => (template ? file.includes(template) : true))
    .sort();

  const newest = matches.at(-1);
  if (!newest) return null;

  return readFileSync(path.join(dir, newest), 'utf8');
}

/** Pulls the six digit reset code out of a rendered reset email. */
export function resetCodeFrom(html: string): string | null {
  // The code sits in the large monospace block in the template.
  const match = html.match(/letter-spacing:0\.34em[^>]*>\s*(\d{6})\s*</);
  return match?.[1] ?? null;
}

/** Pulls the confirmation link out of a rendered verification email. */
export function verificationLinkFrom(html: string): string | null {
  const match = html.match(/href="([^"]*\/api\/auth\/verify\?token=[^"]+)"/);
  const href = match?.[1]?.replace(/&amp;/g, '&');
  if (!href) return null;

  // Returned as a path rather than an absolute address. NEXT_PUBLIC_SITE_URL is
  // inlined when the application is built, so a link produced by a build made
  // for another origin still has to be followed against the server under test.
  try {
    const url = new URL(href);
    return `${url.pathname}${url.search}`;
  } catch {
    return href;
  }
}

/** Signs an account in through the standalone page and waits for the portal. */
export async function signIn(page: Page, identifier: string, password: string) {
  await page.goto('/signin');
  await page.getByLabel('Email address or admission number').fill(identifier);
  // Not an exact match: a required field carries a visual asterisk inside its
  // label, so the label text is "Password *" rather than "Password".
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Completes public registration up to the pending dashboard. */
export async function registerStudent(
  page: Page,
  identity: ReturnType<typeof newIdentity>,
  classLevel = 'JSS 1',
) {
  await page.goto('/signup');

  await page.getByLabel('Full name of the student').fill(identity.fullName);
  await page.getByLabel('Email address').fill(identity.email);
  await page.getByLabel('Phone number').fill(identity.phone);
  await page.getByLabel('Password').fill(identity.password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await page.waitForURL('**/signup/details', { timeout: 20_000 });

  await page.getByLabel('Date of birth').fill('2012-05-14');
  await page.getByLabel('Class applying for').selectOption(classLevel);
  await page.getByLabel('Guardian full name').fill(identity.guardianName);
  await page.getByLabel('Guardian email address').fill(identity.guardianEmail);
  await page.getByLabel('Guardian phone number').fill(identity.guardianPhone);

  await page.getByRole('checkbox').first().check();
  await page.getByRole('checkbox').nth(1).check();

  await page.getByRole('button', { name: 'Submit registration' }).click();
  await page.waitForURL('**/dashboard', { timeout: 20_000 });
}

/**
 * Opens the authentication panel from the header.
 *
 * On a phone the header controls live behind the menu toggle, so the menu is
 * opened first. Only visible controls are considered, because the desktop pair
 * stays in the DOM at small widths and is merely hidden.
 */
export async function openAuthFromHeader(page: Page, mode: 'signin' | 'signup'): Promise<void> {
  // The header controls are labelled Login and Apply Now, which are not the
  // labels on the forms those controls open.
  const label = mode === 'signin' ? 'Login' : 'Apply Now';
  const control = () => page.getByRole('button', { name: label }).locator('visible=true').first();

  if ((await control().count()) === 0) {
    await page.getByRole('button', { name: 'Open menu' }).click();
  }

  await control().click();
}

/**
 * Turns off scroll animation for a test page.
 *
 * The site scrolls smoothly, which is right for a person: they scroll, the
 * page settles, then they tap. A synthetic click does not wait, so it computes
 * a coordinate while the page is still moving and lands on whatever has slid
 * under the pointer. This removes the animation for the tests only. It does
 * not change what any test is asserting.
 */
export async function disableScrollAnimation(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = 'html { scroll-behavior: auto !important; }';
    document.addEventListener('DOMContentLoaded', () => document.head.append(style));
  });
}
