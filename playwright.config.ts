import { defineConfig, devices } from '@playwright/test';

import { existsSync } from 'node:fs';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * Some images ship Chromium at a fixed path rather than the revision this
 * Playwright version would download. When that build is present it is used, so
 * the suite runs without fetching a browser.
 */
const PREINSTALLED_CHROMIUM = '/opt/pw-browsers/chromium';
const executablePath = existsSync(PREINSTALLED_CHROMIUM) ? PREINSTALLED_CHROMIUM : undefined;

/**
 * End to end tests run against the real production build, talking to the real
 * database. Nothing is mocked, which is the only way to prove the flows work.
 *
 * Two projects, matching the two screen classes the school actually has to
 * support: a common Android phone and a Windows desktop.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--disable-dev-shm-usage'], executablePath },
  },

  projects: [
    {
      name: 'desktop-windows',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      // A phone sized viewport without device emulation. This is the project
      // that proves the responsive layout, and it is the one to trust when the
      // two disagree.
      name: 'small-screen',
      use: { ...devices['Desktop Chrome'], viewport: { width: 412, height: 915 } },
    },
    {
      // Full Android emulation, including touch. Useful, but the metrics it
      // reports depend on the Chromium build being matched to the Playwright
      // version. Where a browser is supplied by the image rather than
      // downloaded, window.innerHeight can disagree with the configured
      // viewport, which throws off synthetic click coordinates on long forms.
      // Layout problems show up in small-screen; treat a failure that appears
      // only here as suspect until it reproduces there.
      name: 'android-phone',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    command: `npx next start -p ${PORT}`,
    url: baseURL,
    // Links inside emails are built from this, so it has to match the server
    // the tests are actually talking to.
    env: { NEXT_PUBLIC_SITE_URL: baseURL },
    // Never reuse a server that happens to be listening. A leftover process
    // from an earlier build will happily serve stale code and produce failures
    // that have nothing to do with the current source.
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
