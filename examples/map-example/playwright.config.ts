import { defineConfig, devices } from '@playwright/test';

// Use fixed preferred ports. If in use, `reuseExistingServer` (local) reuses
// the running server. In CI, validate.mjs assigns unique ports via env vars.
const port = Number(process.env.SUNPEAK_TEST_PORT) || 6776;
const sandboxPort = Number(process.env.SUNPEAK_SANDBOX_PORT) || 24680;

export default defineConfig({
  globalSetup: './tests/e2e/global-setup.ts',
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Limit parallel workers. Each test loads a full simulator page with
  // iframe → cross-origin sandbox proxy → inner iframe. Too many concurrent
  // pages overwhelm the sandbox proxy server and cause PostMessage relay
  // timeouts. 2 workers balances speed vs reliability.
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
    command: `PORT=${port} SUNPEAK_SANDBOX_PORT=${sandboxPort} pnpm dev`,
    url: `http://localhost:${port}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
