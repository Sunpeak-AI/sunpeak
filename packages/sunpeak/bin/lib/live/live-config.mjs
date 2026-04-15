/**
 * Shared Playwright config factory for live tests across all hosts.
 *
 * Each host (ChatGPT, Claude) calls createLiveConfig() with its host-specific
 * settings (project name, auth file name). Browser environment options
 * (colorScheme, viewport, locale, etc.) are shared across all hosts.
 *
 * Host-specific configs re-export as defineLiveConfig() for user convenience.
 */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ANTI_BOT_ARGS, CHROME_USER_AGENT } from './utils.mjs';
import { getPortSync } from '../get-port.mjs';
import { resolveSunpeakBin } from '../resolve-bin.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GLOBAL_SETUP_PATH = join(__dirname, 'global-setup.mjs');

/**
 * Create a Playwright config for live testing against a specific host.
 *
 * @param {Object} hostOptions - Host-specific settings
 * @param {string} hostOptions.hostId - Host identifier (e.g., 'chatgpt', 'claude')
 * @param {string} [hostOptions.authFileName] - Auth state filename (default: '{hostId}.json')
 *
 * @param {Object} [options] - User-facing options
 * @param {string} [options.testDir='.'] - Test directory (relative to playwright.config.ts)
 * @param {string} [options.authDir] - Directory for auth state (defaults to {testDir}/.auth)
 * @param {number} [options.vitePort] - Port for the Vite dev server (defaults to a free port near 3456)
 * @param {'light'|'dark'} [options.colorScheme] - Emulate light or dark mode (prefers-color-scheme)
 * @param {{ width: number, height: number }} [options.viewport] - Browser viewport size
 * @param {string} [options.locale] - Browser locale (e.g., 'en-US', 'fr-FR')
 * @param {string} [options.timezoneId] - Timezone (e.g., 'America/New_York')
 * @param {{ latitude: number, longitude: number }} [options.geolocation] - Geolocation coordinates
 * @param {string[]} [options.permissions] - Browser permissions to grant (e.g., ['geolocation'])
 * @param {boolean} [options.devOverlay=true] - Show the dev overlay (resource timestamp + tool timing) in resources
 * @param {Object} [options.use] - Additional Playwright `use` options (merged with defaults)
 * @param {Object} [options.server] - External MCP server config (omit for sunpeak projects)
 * @param {string} [options.server.url] - Server URL (e.g., 'http://localhost:8000/mcp')
 * @param {string} [options.server.command] - Server start command
 * @param {string[]} [options.server.args] - Command arguments
 */
export function createLiveConfig(hostOptions, options = {}) {
  const { hostId, authFileName } = hostOptions;
  const {
    testDir = '.',
    authDir,
    vitePort = getPortSync(3456),
    devOverlay = true,
    colorScheme,
    viewport,
    locale,
    timezoneId,
    geolocation,
    permissions,
    use: userUse,
    server,
  } = options;

  const resolvedAuthDir = authDir || join(testDir, '.auth');
  const authFile = join(process.cwd(), resolvedAuthDir, authFileName || `${hostId}.json`);

  // Pass auth file path to global setup via env var (Playwright runs globalSetup
  // in a separate worker, so we can't pass it as a function argument).
  process.env.SUNPEAK_AUTH_FILE = authFile;

  // Only include browser env keys that were actually passed so Playwright uses its defaults.
  const browserEnv = {
    ...(colorScheme && { colorScheme }),
    ...(viewport && { viewport }),
    ...(locale && { locale }),
    ...(timezoneId && { timezoneId }),
    ...(geolocation && { geolocation }),
    ...(permissions && { permissions }),
  };

  return {
    testDir,
    globalSetup: GLOBAL_SETUP_PATH,
    timeout: 120_000, // 2 minutes per test — LLM responses can be slow
    retries: 1, // One retry for LLM non-determinism
    fullyParallel: true, // Each test gets its own chat — safe to parallelize
    reporter: 'list',
    use: {
      headless: false,
      storageState: process.env.SUNPEAK_STORAGE_STATE || authFile,
      userAgent: CHROME_USER_AGENT,
      launchOptions: {
        args: ANTI_BOT_ARGS,
      },
      ...browserEnv,
      ...userUse,
    },
    projects: [
      {
        name: hostId,
      },
    ],
    webServer: {
      command: buildLiveWebServerCommand({ server, vitePort, devOverlay }),
      url: `http://127.0.0.1:${vitePort}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  };
}

/**
 * Build the webServer command for live tests.
 * Uses `sunpeak inspect` for external servers, `pnpm dev` for sunpeak projects.
 */
function buildLiveWebServerCommand({ server, vitePort, devOverlay }) {
  const sandboxPort = getPortSync(24680);
  const envPrefix = `SUNPEAK_LIVE_TEST=1 SUNPEAK_SANDBOX_PORT=${sandboxPort}${devOverlay ? '' : ' SUNPEAK_DEV_OVERLAY=false'}`;

  if (server) {
    // External MCP server — launch sunpeak inspect
    const bin = resolveSunpeakBin();
    if (server.url) {
      return `${envPrefix} ${bin} inspect --server ${server.url} --port ${vitePort}`;
    }
    if (server.command) {
      const cmd = server.args
        ? `${server.command} ${server.args.join(' ')}`
        : server.command;
      return `${envPrefix} ${bin} inspect --server "${cmd}" --port ${vitePort}`;
    }
  }

  // sunpeak framework project — use pnpm dev
  return `${envPrefix} pnpm dev -- --prod-resources --port ${vitePort}`;
}
