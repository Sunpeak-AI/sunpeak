/**
 * Playwright config factory for inspect mode (BYOS — Bring Your Own Server).
 *
 * Generates a complete Playwright config that starts `sunpeak inspect` as the
 * webServer and runs e2e tests against the inspector.
 *
 * Usage in playwright.config.ts:
 *   import { defineInspectConfig } from 'sunpeak/test/inspect/config';
 *   export default defineInspectConfig({
 *     server: 'http://localhost:8000/mcp',
 *   });
 *
 * Note: For new projects, prefer `defineConfig` from 'sunpeak/test/config'
 * which auto-detects the project type and handles both sunpeak projects
 * and external servers.
 */
import { createBaseConfig, resolvePorts } from '../test/base-config.mjs';
import { resolveSunpeakBin } from '../resolve-bin.mjs';

/**
 * Create a complete Playwright config for testing an external MCP server.
 *
 * @param {Object} options
 * @param {string} options.server - MCP server URL or stdio command (required)
 * @param {string} [options.testDir='tests/e2e'] - Test directory
 * @param {string} [options.simulationsDir] - Simulation JSON directory
 * @param {string[]} [options.hosts=['chatgpt', 'claude']] - Host shells to test
 * @param {string} [options.name] - App name in inspector chrome
 * @param {Object} [options.use] - Additional Playwright `use` options
 * @param {number} [options.timeout] - Server startup timeout in ms (default: 60000)
 * @param {Record<string, string>} [options.env] - Environment variables for stdio servers
 * @param {string} [options.cwd] - Working directory for stdio servers
 * @param {Record<string, string>} [options.headers] - HTTP headers for HTTP MCP server requests
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
    visual,
    timeout,
    env,
    cwd,
    headers,
  } = options;

  if (!server) {
    throw new Error('defineInspectConfig: `server` option is required');
  }

  const { port, sandboxPort } = resolvePorts();

  // Build the sunpeak inspect command
  const serverArg = shellQuote(server);
  const command = [
    `SUNPEAK_SANDBOX_PORT=${sandboxPort}`,
    `${shellQuote(resolveSunpeakBin())} inspect`,
    `--server ${serverArg}`,
    ...(env
      ? Object.entries(env).map(([k, v]) => {
          const pair = `${k}=${v}`;
          return `--env ${shellQuote(pair)}`;
        })
      : []),
    ...(cwd ? [`--cwd ${shellQuote(cwd)}`] : []),
    ...(headers
      ? Object.entries(headers).map(([k, v]) => `--header ${shellQuote(`${k}: ${v}`)}`)
      : []),
    ...(simulationsDir ? [`--simulations ${shellQuote(simulationsDir)}`] : []),
    `--port ${port}`,
    ...(name ? [`--name ${shellQuote(name)}`] : []),
  ].join(' ');

  return createBaseConfig({
    hosts,
    testDir,
    port,
    use: userUse,
    visual,
    timeout,
    webServer: {
      command,
      healthUrl: `http://127.0.0.1:${port}/health`,
    },
  });
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}
