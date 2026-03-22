/**
 * Playwright config factory for inspect mode (BYOS — Bring Your Own Server).
 *
 * Generates a complete Playwright config that starts `sunpeak inspect` as the
 * webServer and runs e2e tests against the simulator. Follows the same pattern
 * as `defineLiveConfig` for live tests.
 *
 * Usage in playwright.config.ts:
 *   import { defineInspectConfig } from 'sunpeak/test/inspect/config';
 *   export default defineInspectConfig({
 *     server: 'http://localhost:8000/mcp',
 *   });
 */
import { getPortSync } from '../get-port.mjs';

/**
 * Create a complete Playwright config for testing an external MCP server.
 *
 * @param {Object} options
 * @param {string} options.server - MCP server URL or stdio command (required)
 * @param {string} [options.testDir='tests/e2e'] - Test directory
 * @param {string} [options.simulationsDir='tests/simulations'] - Simulation JSON directory
 * @param {string[]} [options.hosts=['chatgpt', 'claude']] - Host shells to test
 * @param {string} [options.name] - App name in simulator chrome
 * @param {Object} [options.use] - Additional Playwright `use` options
 * @returns {import('@playwright/test').PlaywrightTestConfig}
 */
export function defineInspectConfig(options) {
  const {
    server,
    testDir = 'tests/e2e',
    simulationsDir,
    hosts = ['chatgpt', 'claude'],
    name,
    use: userUse,
  } = options;

  if (!server) {
    throw new Error('defineInspectConfig: `server` option is required');
  }

  const port = Number(process.env.SUNPEAK_TEST_PORT) || getPortSync(6776);
  const sandboxPort = Number(process.env.SUNPEAK_SANDBOX_PORT) || getPortSync(24680);

  // Build the sunpeak inspect command
  const serverArg = server.includes(' ') ? `"${server}"` : server;
  const command = [
    'npx sunpeak inspect',
    `--server ${serverArg}`,
    ...(simulationsDir ? [`--simulations ${simulationsDir}`] : []),
    `--port ${port}`,
    ...(name ? [`--name "${name}"`] : []),
  ].join(' ');

  return {
    testDir,
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    // Limit workers to avoid overwhelming the double-iframe sandbox proxy.
    workers: process.env.CI ? 1 : 2,
    reporter: 'list',
    use: {
      baseURL: `http://localhost:${port}`,
      trace: 'on-first-retry',
      ...userUse,
    },
    projects: hosts.map((host) => ({ name: host })),
    webServer: {
      command: `SUNPEAK_SANDBOX_PORT=${sandboxPort} ${command}`,
      url: `http://localhost:${port}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  };
}
