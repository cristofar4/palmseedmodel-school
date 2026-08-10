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
      name: 'android-phone',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    command: `npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
