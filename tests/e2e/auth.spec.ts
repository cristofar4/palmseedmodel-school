import { expect, test } from '@playwright/test';
import {
  clearRateLimits,
  disableScrollAnimation,
  latestOutboxMessage,
  newIdentity,
  registerStudent,
  resetCodeFrom,
  signIn,
  signOut,
  verificationLinkFrom,
} from './helpers';

// The suite signs in far more often than a person would, from one address.
// Resetting the buckets keeps the production limits at their real values.
test.beforeEach(async ({ page }) => {
  await clearRateLimits();
  await disableScrollAnimation(page);
});

test.describe('registration and sign in', () => {
  test('a family can register and reach the limited dashboard', async ({ page }) => {
    const identity = newIdentity('signup');

    await registerStudent(page, identity);

    // Pending Review, and told so plainly.
    await expect(page.getByText('Pending Review').first()).toBeVisible();
    await expect(page.getByText('Your registration is being reviewed')).toBeVisible();

    // The submitted details are shown back.
    await expect(page.getByText(identity.email).first()).toBeVisible();
    await expect(page.getByText(identity.guardianName).first()).toBeVisible();

    // No admission number has been invented.
    await expect(page.getByText('Not yet issued').first()).toBeVisible();

    // The enrolled record sections stay closed.
    await page.goto('/dashboard/records');
    await expect(page.getByText('This section is not open yet')).toBeVisible();
  });

  test('the verification email arrives and the link confirms the address', async ({ page }) => {
    const identity = newIdentity('verify');
    await registerStudent(page, identity);

    const message = latestOutboxMessage(identity.email, 'email_verification');
    expect(message, 'a verification email should have been rendered').not.toBeNull();

    const link = verificationLinkFrom(message!);
    expect(link).not.toBeNull();

    await page.goto(link!);
    await expect(page.getByText('Email address confirmed')).toBeVisible();

    // Opening it a second time does not consume another token or error.
    await page.goto(link!);
    await expect(page.getByText(/already confirmed|Email address confirmed/)).toBeVisible();
  });

  test('a registered account can sign out and sign back in', async ({ page }) => {
    const identity = newIdentity('signin');
    await registerStudent(page, identity);

    await signOut(page);

    await signIn(page, identity.email, identity.password);
    await page.waitForURL('**/dashboard', { timeout: 20_000 });
    await expect(page.getByText('Pending Review').first()).toBeVisible();
  });

  test('a wrong password is refused without revealing whether the account exists', async ({
    page,
  }) => {
    await signIn(page, 'definitely.not.registered@example.test', 'some wrong password 1');
    const unknown = await page.getByRole('alert').first().innerText();

    const identity = newIdentity('enum');
    await registerStudent(page, identity);
    await signOut(page);

    await signIn(page, identity.email, 'the wrong password 9');
    const known = await page.getByRole('alert').first().innerText();

    // Identical wording either way, so the form cannot be used to discover
    // which families hold accounts.
    expect(known).toBe(unknown);
  });

  test('duplicate registration is refused', async ({ page }) => {
    const identity = newIdentity('dupe');
    await registerStudent(page, identity);

    await signOut(page);

    await page.goto('/signup');
    await page.getByLabel('Full name of the student').fill(identity.fullName);
    await page.getByLabel('Email address').fill(identity.email);
    await page.getByLabel('Phone number').fill(identity.phone);
    await page.getByLabel('Password').fill(identity.password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText(/already exists|already registered/i).first()).toBeVisible();
  });

  test('the signup form validates before it submits', async ({ page }) => {
    await page.goto('/signup');

    await page.getByLabel('Full name of the student').fill('A');
    await page.getByLabel('Email address').fill('not-an-email');
    await page.getByLabel('Phone number').fill('123');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
  });
});

test.describe('password recovery', () => {
  test('a six digit code resets the password and signs other devices out', async ({ page }) => {
    const identity = newIdentity('reset');
    await registerStudent(page, identity);
    await signOut(page);

    await page.goto('/forgot-password');
    await page.getByLabel('Email address').fill(identity.email);
    await page.getByRole('button', { name: 'Send reset code' }).click();

    await expect(page.getByLabel('Six digit code')).toBeVisible({ timeout: 20_000 });

    const message = latestOutboxMessage(identity.email, 'password_reset_code');
    expect(message, 'a reset email should have been rendered').not.toBeNull();

    const code = resetCodeFrom(message!);
    expect(code, 'the email should carry a six digit code').toMatch(/^\d{6}$/);

    // A wrong code is refused and says how many attempts remain.
    await page.getByLabel('Six digit code').fill('000000');
    await page.getByLabel('New password').fill('kaduna harbour 2026 vx');
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.getByText(/not correct|not valid/i).first()).toBeVisible();

    await page.getByLabel('Six digit code').fill(code!);
    await page.getByLabel('New password').fill('kaduna harbour 2026 vx');
    await page.getByRole('button', { name: 'Set new password' }).click();

    await page.waitForURL('**/signin**', { timeout: 20_000 });
    await expect(page.getByText('Password changed')).toBeVisible();

    // The old password no longer works, the new one does.
    await signIn(page, identity.email, identity.password);
    await expect(page.getByRole('alert').first()).toBeVisible();

    await signIn(page, identity.email, 'kaduna harbour 2026 vx');
    await page.waitForURL('**/dashboard', { timeout: 20_000 });
  });

  test('recovery does not disclose whether an address is registered', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email address').fill('nobody.here@example.test');
    await page.getByRole('button', { name: 'Send reset code' }).click();

    await expect(page.getByText(/if that address has an account/i)).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe('access control', () => {
  test('an anonymous visitor cannot reach the portal', async ({ page }) => {
    for (const route of ['/dashboard', '/admin', '/teacher']) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/signin/);
    }
  });

  test('a student cannot reach the administrator or teacher areas', async ({ page }) => {
    const identity = newIdentity('rbac');
    await registerStudent(page, identity);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/teacher');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('a student cannot call the administrator API', async ({ page }) => {
    const identity = newIdentity('api');
    await registerStudent(page, identity);

    const status = await page.evaluate(async () => {
      const response = await fetch('/api/admin/students/status', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: '00000000-0000-0000-0000-000000000000', status: 'active' }),
      });
      return response.status;
    });

    // Refused before the body is even considered. 403 for the missing CSRF
    // token, or 403 for the role. Either way it is not carried out.
    expect([401, 403]).toContain(status);
  });

  test('a request without the CSRF token is refused', async ({ page }) => {
    await page.goto('/');

    const status = await page.evaluate(async () => {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: 'a@b.test', password: 'whatever 12' }),
      });
      return response.status;
    });

    expect(status).toBe(403);
  });
});
