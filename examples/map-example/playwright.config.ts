import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';

/**
 * Find an available port synchronously.
 * Spawns a tiny Node script that binds, prints the port, and exits.
 */
function getPortSync(preferred: number): number {
  const script = `
    const s = require("net").createServer();
    s.listen(${preferred}, () => {
      process.stdout.write(String(s.address().port));
      s.close();
    });
    s.on("error", () => {
      const f = require("net").createServer();
      f.listen(0, () => {
        process.stdout.write(String(f.address().port));
        f.close();
      });
    });
  `;
  return Number(execSync(`node -e '${script}'`, { encoding: 'utf-8' }).trim());
}

const port = Number(process.env.SUNPEAK_TEST_PORT) || getPortSync(6776);

export default defineConfig({
  globalSetup: './tests/e2e/global-setup.ts',
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
    command: `PORT=${port} pnpm dev`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
