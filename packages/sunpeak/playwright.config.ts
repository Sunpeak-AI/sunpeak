import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for package-level simulator e2e tests.
 *
 * These tests verify simulator behavior (inspect mode, prod-tools, Tool Result
 * editing) using the template project's dev server. They test the sunpeak
 * package itself, not the template app's resources.
 */

// Use fixed preferred ports. In CI these are stable; locally getPort() in the
// dev server finds alternatives if taken. Using dynamic getPortSync here causes
// issues when Playwright re-evaluates the config (each evaluation gets a different port).
const port = Number(process.env.SUNPEAK_TEST_PORT) || 6777;
const sandboxPort = Number(process.env.SUNPEAK_SANDBOX_PORT) || 24681;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--use-gl=angle'],
        },
      },
    },
  ],
  webServer: {
    command: `PORT=${port} SUNPEAK_SANDBOX_PORT=${sandboxPort} pnpm -C template dev`,
    url: `http://localhost:${port}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
