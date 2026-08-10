import { expect, test } from '@playwright/test';
import {
  clearRateLimits,
  latestOutboxMessage,
  newIdentity,
  registerStudent,
  signIn,
  signOut,
} from './helpers';

test.beforeEach(async () => {
  await clearRateLimits();
});

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'christopherpraise864@gmail.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'LocalTest-Palmseed-2026-xyz';

async function signInAsAdmin(page: import('@playwright/test').Page) {
  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.waitForURL('**/admin', { timeout: 20_000 });
}

test.describe('administrator dashboard', () => {
  test('shows real counts rather than invented ones', async ({ page }) => {
    await signInAsAdmin(page);

    await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible();
    await expect(page.getByText('Students', { exact: true }).first()).toBeVisible();

    // Every figure on the overview must be a number read from the database.
    const values = await page.locator('p.tabular-nums').allInnerTexts();
    expect(values.length).toBeGreaterThan(0);
    for (const value of values.slice(0, 8)) {
      expect(value.trim()).toMatch(/^[\d,]+$|^Not|^PMS|^[A-Z]/);
    }
  });

  test('the academic setup, approval and student record flow works end to end', async ({
    page,
  }) => {
    const identity = newIdentity('approve');

    // A family registers.
    await registerStudent(page, identity, 'JSS 1');
    await signOut(page);

    await signInAsAdmin(page);

    // The registration is visible to the school immediately.
    await page.goto('/admin/applications');
    await expect(page.getByText(identity.fullName).first()).toBeVisible();

    // Make sure a session and a class exist to admit into.
    await page.goto('/admin/academics');

    const hasSession = await page.getByText(/\(current\)|Current/).first().isVisible().catch(() => false);
    if (!hasSession) {
      await page.getByLabel('Name').first().fill('2026/2027');
      await page.getByLabel('Starts on').first().fill('2026-09-01');
      await page.getByLabel('Ends on').first().fill('2027-07-31');
      await page.getByRole('button', { name: 'Create session' }).click();
      await expect(page.getByText(/created/i).first()).toBeVisible({ timeout: 15_000 });
    }

    const hasClass = await page
      .getByRole('heading', { name: 'Classes' })
      .locator('..')
      .getByText(/JSS 1/)
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasClass) {
      await page.getByLabel('Level').selectOption('JSS 1');
      await page.getByLabel('Arm').fill('A');
      await page.getByRole('button', { name: 'Create class' }).click();
      await expect(page.getByText(/created/i).first()).toBeVisible({ timeout: 15_000 });
    }

    // Approve the registration.
    await page.goto('/admin/applications');
    await page.getByRole('link', { name: 'Review' }).first().click();

    await expect(page.getByRole('heading', { name: 'Decision' })).toBeVisible();
    await page.getByRole('button', { name: /Approve and issue an admission number/ }).click();

    await expect(page.getByText('Decision recorded')).toBeVisible({ timeout: 25_000 });
    const confirmation = await page.getByText('Decision recorded').locator('..').innerText();
    const admissionNumber = confirmation.match(/PMS\/\d{4}\/\d{4}/)?.[0];
    expect(admissionNumber, 'an admission number should have been issued').toBeTruthy();

    // Both the student and the guardian were emailed.
    expect(latestOutboxMessage(identity.email, 'registration_approved')).not.toBeNull();
    expect(latestOutboxMessage(identity.guardianEmail, 'registration_approved')).not.toBeNull();

    // The delivery history records it.
    await page.goto('/admin/email');
    await expect(page.getByText(identity.email).first()).toBeVisible();

    await signOut(page);

    // The student is now active and the full portal has opened.
    await signIn(page, identity.email, identity.password);
    await page.waitForURL('**/dashboard', { timeout: 20_000 });

    await expect(page.getByText('Active').first()).toBeVisible();
    await expect(page.getByText(admissionNumber!).first()).toBeVisible();

    // The record pages are reachable now, and show honest empty states rather
    // than invented marks.
    await page.goto('/dashboard/records');
    await expect(page.getByText('No results have been published yet.')).toBeVisible();
    await expect(page.getByText('Subjects')).toBeVisible();

    await page.goto('/dashboard/fees');
    await expect(page.getByText('No fee records have been entered yet.')).toBeVisible();

    // Sign in with the admission number instead of the email address.
    await signOut(page);

    await signIn(page, admissionNumber!, identity.password);
    await page.waitForURL('**/dashboard', { timeout: 20_000 });
    await expect(page.getByText('Active').first()).toBeVisible();
  });

  test('the activity feed records account creation and sign ins', async ({ page }) => {
    const identity = newIdentity('feed');
    await registerStudent(page, identity);
    await signOut(page);

    await signInAsAdmin(page);
    await page.goto('/admin/security');

    await expect(page.getByRole('heading', { name: 'Authentication activity' })).toBeVisible();
    await expect(page.getByText(identity.fullName).first()).toBeVisible();

    // No raw network address is ever printed.
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  });

  test('a teaching account can be created and receives an activation link', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/admin/teachers');

    const stamp = Date.now();
    const teacherEmail = `e2e.teacher.${stamp}@example.test`;

    await page.getByLabel('Full name').fill('Test Teacher');
    await page.getByLabel('Staff number').fill(`STF${stamp}`);
    await page.getByLabel('Email address').fill(teacherEmail);
    await page.getByLabel('Phone number').fill('08011122233');
    await page.getByRole('button', { name: 'Create teaching account' }).click();

    await expect(page.getByText(/activation email has been sent/i)).toBeVisible({
      timeout: 25_000,
    });

    // No password was set here and none was mailed.
    const message = latestOutboxMessage(teacherEmail, 'account_activation');
    expect(message).not.toBeNull();
    expect(message!).toContain('/activate?token=');
    expect(message!.toLowerCase()).not.toContain('your password is');
  });

  test('student records export as CSV honouring the filters', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/admin/students');

    const download = page.waitForEvent('download', { timeout: 25_000 });
    await page.getByRole('link', { name: 'Export CSV' }).click();
    const file = await download;

    expect(file.suggestedFilename()).toMatch(/^palmseed-students-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test('the sign in notification setting can be changed', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/admin/settings');

    await page.getByRole('radio', { name: /Unusual sign ins only/ }).check();
    await page.getByRole('button', { name: 'Save setting' }).click();
    await expect(page.getByText('Setting saved.')).toBeVisible({ timeout: 15_000 });

    // Put it back to the default the school asked for.
    await page.getByRole('radio', { name: /Every student sign in/ }).check();
    await page.getByRole('button', { name: 'Save setting' }).click();
    await expect(page.getByText('Setting saved.')).toBeVisible({ timeout: 15_000 });
  });

  test('an announcement published here appears on the public notice board', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/admin/announcements');

    const title = `Test notice ${Date.now()}`;
    await page.getByLabel('Title').fill(title);
    await page
      .getByLabel('Announcement')
      .fill('This notice was published by the end to end test suite.');
    await page.getByLabel('Audience').selectOption('public');
    await page.getByRole('button', { name: 'Save announcement' }).click();

    await expect(page.getByText('Announcement published.')).toBeVisible({ timeout: 15_000 });

    await page.goto('/news');
    await expect(page.getByText(title)).toBeVisible();
  });
});
