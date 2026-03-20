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
const sandboxPort = Number(process.env.SUNPEAK_SANDBOX_PORT) || getPortSync(24680);

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
