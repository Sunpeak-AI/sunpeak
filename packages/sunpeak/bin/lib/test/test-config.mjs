/**
 * Playwright config factory for MCP server testing.
 *
 * Auto-detects project type:
 * - sunpeak framework projects: starts `sunpeak dev` as the backend
 * - External MCP servers: starts `sunpeak inspect` as the backend
 *
 * Usage (sunpeak project):
 *   import { defineConfig } from 'sunpeak/test/config';
 *   export default defineConfig();
 *
 * Usage (external server):
 *   import { defineConfig } from 'sunpeak/test/config';
 *   export default defineConfig({
 *     server: { command: 'python', args: ['server.py'] },
 *   });
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createBaseConfig, resolvePorts } from './base-config.mjs';

/**
 * @param {Object} [options]
 * @param {Object} [options.server] - MCP server connection (omit for sunpeak projects)
 * @param {string} [options.server.command] - Server start command
 * @param {string[]} [options.server.args] - Command arguments
 * @param {string} [options.server.url] - HTTP server URL (alternative to command)
 * @param {Record<string, string>} [options.server.env] - Environment variables
 * @param {string[]} [options.hosts] - Host shells to test (default: ['chatgpt', 'claude'])
 * @param {string} [options.testDir] - Test directory
 * @param {string} [options.simulationsDir] - Simulations directory for mock data
 * @param {string} [options.globalSetup] - Global setup file path
 * @param {Object} [options.use] - Additional Playwright `use` options
 * @returns {import('@playwright/test').PlaywrightTestConfig}
 */
export function defineConfig(options = {}) {
  const {
    server,
    hosts = ['chatgpt', 'claude'],
    testDir,
    simulationsDir,
    globalSetup,
    use: userUse,
    visual,
  } = options;

  const { port, sandboxPort } = resolvePorts();
  const isSunpeakProject = !server && detectSunpeakProject();

  const resolvedTestDir = testDir || (isSunpeakProject ? 'tests/e2e' : '.');

  let command;
  if (server) {
    // External MCP server mode
    command = buildInspectCommand({ server, port, sandboxPort, simulationsDir });
  } else if (isSunpeakProject) {
    // sunpeak framework project mode
    command = `PORT=${port} SUNPEAK_SANDBOX_PORT=${sandboxPort} pnpm dev`;
  } else {
    throw new Error(
      'defineConfig: either provide a `server` option or run from a sunpeak project directory.'
    );
  }

  return createBaseConfig({
    hosts,
    testDir: resolvedTestDir,
    port,
    use: userUse,
    globalSetup,
    visual,
    webServer: {
      command,
      healthUrl: `http://localhost:${port}/health`,
    },
  });
}

/**
 * Detect if the current directory is a sunpeak framework project.
 */
function detectSunpeakProject() {
  const pkgPath = join(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return 'sunpeak' in deps;
  } catch {
    return false;
  }
}

/**
 * Build the `sunpeak inspect` command for external MCP servers.
 */
function buildInspectCommand({ server, port, sandboxPort, simulationsDir }) {
  const parts = [`SUNPEAK_SANDBOX_PORT=${sandboxPort}`];

  if (server.env) {
    for (const [key, value] of Object.entries(server.env)) {
      parts.push(`${key}=${value}`);
    }
  }

  parts.push('npx sunpeak inspect');

  if (server.url) {
    parts.push(`--server ${server.url}`);
  } else if (server.command) {
    const cmd = server.args
      ? `${server.command} ${server.args.join(' ')}`
      : server.command;
    // Quote the command if it contains spaces
    parts.push(`--server "${cmd}"`);
  }

  if (simulationsDir) {
    parts.push(`--simulations ${simulationsDir}`);
  }

  parts.push(`--port ${port}`);

  return parts.join(' ');
}
