import { expect, test } from '@playwright/test';

test.describe('public website', () => {
  test('the landing page presents the school and its structure', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.goto('/');

    await expect(page).toHaveTitle(/Palmseed Model School/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // The motto and the Nigerian class structure are the two things that must
    // always be on the page.
    await expect(page.getByText('Always Useful').first()).toBeVisible();
    for (const level of ['JSS 1', 'JSS 3', 'SS 1', 'SS 3']) {
      await expect(page.getByText(level, { exact: true }).first()).toBeVisible();
    }

    for (const pathway of ['Science', 'Art', 'Commercial']) {
      await expect(page.getByText(pathway, { exact: true }).first()).toBeVisible();
    }

    expect(consoleErrors).toEqual([]);
  });

  test('every public page renders', async ({ page }) => {
    const routes = [
      ['/about', 'About Palmseed'],
      ['/academics', 'Academics'],
      ['/admissions', 'Admissions'],
      ['/school-life', 'School Life'],
      ['/news', 'Notice board'],
      ['/contact', 'Contact'],
      ['/privacy', 'Legal'],
      ['/portal-terms', 'Legal'],
    ] as const;

    for (const [route, eyebrow] of routes) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} should return 200`).toBe(200);
      await expect(page.getByText(eyebrow).first()).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('no invented contact details are published', async ({ page }) => {
    await page.goto('/contact');

    const body = (await page.locator('body').innerText()).toLowerCase();

    // The school has not supplied an address or a telephone number, so neither
    // may appear anywhere on the page.
    expect(body).not.toMatch(/\+234\s?\d/);
    expect(body).not.toMatch(/\b0[789]\d{9}\b/);
    expect(body).toContain('christopherpraise864@gmail.com');
  });

  test('the contact form reports validation problems and then succeeds', async ({ page }) => {
    await page.goto('/contact');

    await page.getByLabel('Your name').fill('Chidi Test');
    await page.getByLabel('Email address').fill('chidi.test@example.test');
    await page.getByLabel('Subject').fill('Admission enquiry');
    await page.getByLabel('Message').fill('too short');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByRole('alert').first()).toBeVisible();

    await page
      .getByLabel('Message')
      .fill('Please could you tell me when registration closes for the coming session.');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText('Message sent')).toBeVisible({ timeout: 20_000 });
  });

  test('the page has one main landmark and a skip link', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('main#main')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveCount(1);
  });

  test('the layout does not scroll sideways', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(400);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    // A couple of pixels of rounding is tolerable, a horizontal scrollbar is not.
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
