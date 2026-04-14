/**
 * Shared Playwright config builder used by both defineConfig() (sunpeak projects)
 * and defineInspectConfig() (external MCP servers).
 *
 * Produces a config with per-host Playwright projects, sensible defaults for
 * MCP App testing, and a webServer entry to launch the inspector backend.
 */
import { getPortSync } from '../get-port.mjs';

/**
 * @param {Object} options
 * @param {string[]} options.hosts - Host shells to create projects for
 * @param {string} options.testDir - Test directory
 * @param {Object} options.webServer - { command, healthUrl }
 * @param {number} options.port - Inspector port
 * @param {Object} [options.use] - Additional Playwright `use` options
 * @param {string} [options.globalSetup] - Global setup file path
 * @param {number} [options.timeout] - WebServer startup timeout in ms (default: 60000)
 * @returns {import('@playwright/test').PlaywrightTestConfig}
 */
export function createBaseConfig({ hosts, testDir, webServer, port, use, globalSetup, visual, timeout }) {
  // Separate snapshot path from other visual options passed to expect.toHaveScreenshot
  const { snapshotPathTemplate, ...toHaveScreenshotDefaults } = visual ?? {};

  return {
    ...(globalSetup ? { globalSetup } : {}),
    testDir,
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    // Limit workers to avoid overwhelming the double-iframe sandbox proxy.
    workers: process.env.CI ? 1 : 2,
    reporter: 'list',
    // Only override snapshot path when visual config is provided, to avoid
    // changing Playwright's default for projects that don't use visual testing.
    ...(visual
      ? {
          snapshotPathTemplate:
            snapshotPathTemplate ??
            '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
        }
      : {}),
    ...(Object.keys(toHaveScreenshotDefaults).length > 0
      ? { expect: { toHaveScreenshot: toHaveScreenshotDefaults } }
      : {}),
    use: {
      // Use 127.0.0.1 instead of localhost to avoid IPv4/IPv6 resolution
      // ambiguity that causes ECONNREFUSED flakes on macOS.
      baseURL: `http://127.0.0.1:${port}`,
      trace: 'on-first-retry',
      ...use,
    },
    projects: hosts.map((host) => ({ name: host })),
    webServer: {
      command: webServer.command,
      url: webServer.healthUrl,
      reuseExistingServer: !process.env.CI,
      timeout: timeout ?? 60_000,
    },
  };
}

/**
 * Resolve ports for the inspector and sandbox proxy.
 * Respects env vars for CI where validate.mjs assigns unique ports.
 */
export function resolvePorts() {
  const port = parsePort(process.env.SUNPEAK_TEST_PORT) ?? getPortSync(6776);
  const sandboxPort = parsePort(process.env.SUNPEAK_SANDBOX_PORT) ?? getPortSync(24680);
  return { port, sandboxPort };
}

/** Parse a port string, returning the number or null if invalid/absent. */
function parsePort(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}
