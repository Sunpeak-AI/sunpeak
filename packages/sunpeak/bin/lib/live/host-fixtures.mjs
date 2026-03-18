/**
 * Factory for creating host-specific Playwright fixtures.
 *
 * Each host (ChatGPT, Claude) creates its own fixtures by calling
 * createHostFixtures() with its HostPage subclass and message formatting.
 *
 * This keeps the fixture logic DRY — login, refresh, invoke, and
 * app name handling are shared across all hosts.
 */
import { resolvePlaywrightESM, getAppName } from './utils.mjs';

// Resolve @playwright/test from the user's project (pnpm strict resolution).
const projectRoot = process.env.SUNPEAK_PROJECT_ROOT || process.cwd();
const { test: base, expect } = await resolvePlaywrightESM(projectRoot);

/** App name from the project's package.json — read once at module load. */
const appName = getAppName(projectRoot);

/**
 * Create Playwright test fixtures for a specific host.
 *
 * @param {Object} options
 * @param {string} options.fixtureName - Fixture name in test signatures (e.g., 'chatgpt', 'claude')
 * @param {typeof import('./host-page.mjs').HostPage} options.HostPageClass - Host page class
 * @param {(appName: string, text: string) => string} [options.formatMessage] - Format user messages (e.g., add /{appName} prefix)
 */
export function createHostFixtures({ fixtureName, HostPageClass, formatMessage }) {
  const test = base.extend({
    [fixtureName]: async ({ page }, use) => {
      const hostPage = new HostPageClass(page);
      await hostPage.verifyLoggedIn();

      // MCP server refresh is handled once in globalSetup — no per-worker refresh needed.

      // Enhanced interface with app name handling and invoke() shortcut
      const fixture = Object.create(hostPage);

      if (formatMessage) {
        fixture.sendMessage = async (text) => {
          return hostPage.sendMessage(formatMessage(appName, text));
        };
      }
      fixture.sendRawMessage = hostPage.sendMessage.bind(hostPage);

      /**
       * One-liner: start a new chat, send a prompt, and wait for the app iframe.
       * Returns the FrameLocator for the rendered app — ready for assertions.
       */
      fixture.invoke = async (prompt, options) => {
        await hostPage.startNewChat();
        const message = formatMessage ? formatMessage(appName, prompt) : prompt;
        await hostPage.sendMessage(message);
        return hostPage.waitForAppIframe(options);
      };

      await use(fixture);
    },
  });

  return { test, expect };
}
