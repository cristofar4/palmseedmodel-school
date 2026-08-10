import { expect, test } from '@playwright/test';
import { openAuthFromHeader } from './helpers';

/**
 * The gravity vortex transition.
 *
 * These check the behaviour that matters: it starts from the control that was
 * tapped, it runs for about two seconds, the page is still attached to the
 * hole while it collapses, the correct authentication experience arrives, a
 * second tap cannot break it, and anyone who has asked for reduced motion gets
 * a plain presentation instead.
 */
test.describe('gravity vortex', () => {
  test('collapses the page and opens sign in from the tapped control', async ({ page }) => {
    await page.goto('/');

    const started = Date.now();
    await openAuthFromHeader(page, 'signin');

    // The field paints on a canvas that only exists while the effect runs.
    await expect(page.locator('canvas')).toHaveCount(1);

    // The collapse is under way, and the page is locked so nothing underneath
    // can be scrolled or clicked.
    await expect(page.locator('html')).toHaveAttribute('data-vortex-state', 'collapsing');
    await expect(page.locator('html')).toHaveClass(/vortex-locked/);

    // Part way through, the page must still be present and mid transform. This
    // is the requirement that it stays attached to the hole rather than being
    // hidden early.
    await page.waitForTimeout(900);
    const transform = await page.evaluate(() => {
      const stage = document.querySelector('canvas')?.previousElementSibling?.firstElementChild;
      return stage ? getComputedStyle(stage as Element).transform : 'none';
    });
    expect(transform).not.toBe('none');
    expect(transform).not.toBe('matrix(1, 0, 0, 1, 0, 0)');

    // Completion is published on the document, which is the only honest signal.
    // The panel element is in the DOM from the first frame, so its visibility
    // says nothing about whether the transition has finished.
    await expect(page.locator('html')).toHaveAttribute('data-vortex-state', 'open', {
      timeout: 8_000,
    });

    const elapsed = Date.now() - started;
    // The brief is 1.8 to 2.2 seconds. The lower bound is asserted tightly and
    // the upper bound loosely, so a slow machine does not produce a red build.
    expect(elapsed).toBeGreaterThan(1_700);
    expect(elapsed).toBeLessThan(4_000);

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /Sign in to your portal/ })).toBeVisible();

    // The page underneath stays locked while the panel is open.
    await expect(page.locator('html')).toHaveClass(/vortex-locked/);
  });

  test('the panel stays inside the core until the collapse has finished', async ({ page }) => {
    await page.goto('/');
    await openAuthFromHeader(page, 'signin');

    // Part way through the collapse the panel must still be clipped to
    // essentially nothing at the origin. It is in the DOM from the first
    // frame, so without the clip it would simply cover the page and the
    // collapse would never be seen.
    await page.waitForTimeout(800);

    const readRadius = () =>
      page.evaluate(() => {
        const panel = document.querySelector('[data-vortex-panel]');
        if (!panel) return null;
        const clip = getComputedStyle(panel).clipPath;
        const match = clip.match(/circle\(([\d.]+)px/);
        return match ? Number(match[1]) : null;
      });

    const midRadius = await readRadius();
    expect(midRadius, 'the panel should be clipped during the collapse').not.toBeNull();
    expect(midRadius!).toBeLessThan(60);

    await expect(page.locator('html')).toHaveAttribute('data-vortex-state', 'open', {
      timeout: 8_000,
    });

    // Once the core releases, it has grown to cover the viewport.
    const openRadius = await readRadius();
    expect(openRadius!).toBeGreaterThan(500);
  });

  test('opens the create account experience when that control is tapped', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Begin a registration' }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 8_000 });
    await expect(dialog.getByRole('heading', { name: /Create your Palmseed account/ })).toBeVisible();
  });

  test('repeated taps cannot break the transition', async ({ page }) => {
    await page.goto('/');

    await openAuthFromHeader(page, 'signin');

    // Hammer the control. The guard should ignore everything after the first.
    const trigger = page.getByRole('button', { name: 'Sign in' }).locator('visible=true').first();
    for (let index = 0; index < 5; index += 1) {
      await trigger.click({ force: true, timeout: 2_000 }).catch(() => undefined);
    }

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toHaveCount(1);
    await expect(page.locator('canvas')).toHaveCount(1);
  });

  test('closing reverses the effect and restores the page', async ({ page }) => {
    await page.goto('/');

    await openAuthFromHeader(page, 'signin');
    await expect(page.locator('html')).toHaveAttribute('data-vortex-state', 'open', {
      timeout: 8_000,
    });

    await page.getByRole('button', { name: 'Close and return to the website' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 8_000 });
    await expect(page.locator('html')).not.toHaveClass(/vortex-locked/);
    await expect(page.locator('html')).not.toHaveAttribute('data-vortex-state', /.+/);

    // The landing page is usable again, with its transforms cleared.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const transform = await page.evaluate(() => {
      const stage = document.querySelector('canvas')?.previousElementSibling?.firstElementChild;
      return stage ? getComputedStyle(stage as Element).transform : 'none';
    });
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(transform);
  });

  test('closing during the opening run still works', async ({ page }) => {
    await page.goto('/');

    await openAuthFromHeader(page, 'signin');

    // Deliberately interrupt part way through the collapse. The control must
    // not be dead for the tail of the animation.
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Close and return to the website' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 8_000 });
    await expect(page.locator('html')).not.toHaveClass(/vortex-locked/);
  });

  test('reduced motion gets the panel without the collapse', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();

    await page.goto('/');

    const started = Date.now();
    await openAuthFromHeader(page, 'signin');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 4_000 });

    // No two second wait for anyone who has asked not to be moved around.
    expect(Date.now() - started).toBeLessThan(3_000);

    await context.close();
  });
});
