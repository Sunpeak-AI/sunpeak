/**
 * Host-agnostic Playwright fixtures for live testing.
 *
 * Users import from 'sunpeak/test' and get a `live` fixture that
 * automatically resolves the correct host page object based on the
 * Playwright project name. Adding a new host never changes user imports.
 *
 * Usage:
 *   import { test, expect } from 'sunpeak/test';
 *
 *   test('my resource renders', async ({ live }) => {
 *     const app = await live.invoke('show me something');
 *     await expect(app.locator('img').first()).toBeVisible();
 *   });
 */
import { resolvePlaywrightESM, getAppName } from './utils.mjs';

const projectRoot = process.env.SUNPEAK_PROJECT_ROOT || process.cwd();
const { test: base, expect } = await resolvePlaywrightESM(projectRoot);
const appName = getAppName(projectRoot);

/**
 * Registry of host page classes and their message formatters.
 * Classes are lazy-loaded and cached to avoid importing all hosts when only one is used.
 */
const HOST_REGISTRY = {
  chatgpt: {
    _cached: null,
    load() {
      this._cached ??= import('./chatgpt-page.mjs').then((m) => m.ChatGPTPage);
      return this._cached;
    },
    formatMessage: (name, text) => `/${name} ${text}`,
  },
  // Future: claude: { _cached: null, load() { ... }, formatMessage: ... }
};

/**
 * Resolve the host ID from the current Playwright project name.
 * Project names match the host ID directly (e.g., 'chatgpt').
 */
function resolveHostId(projectName) {
  if (!projectName) return 'chatgpt';
  for (const hostId of Object.keys(HOST_REGISTRY)) {
    if (projectName.startsWith(hostId)) return hostId;
  }
  return 'chatgpt';
}

const test = base.extend({
  live: async ({ page }, use, testInfo) => {
    const hostId = resolveHostId(testInfo.project.name);
    const hostEntry = HOST_REGISTRY[hostId];
    if (!hostEntry) {
      throw new Error(`Unknown live test host: "${hostId}". Supported: ${Object.keys(HOST_REGISTRY).join(', ')}`);
    }

    const HostPageClass = await hostEntry.load();
    const hostPage = new HostPageClass(page);
    await hostPage.verifyLoggedIn();

    const { formatMessage } = hostEntry;
    const fixture = Object.create(hostPage);
    fixture.page = page;

    if (formatMessage) {
      fixture.sendMessage = async (text) => hostPage.sendMessage(formatMessage(appName, text));
    }
    fixture.sendRawMessage = hostPage.sendMessage.bind(hostPage);
    fixture.invoke = async (prompt, options) => {
      await hostPage.startNewChat();
      const message = formatMessage ? formatMessage(appName, prompt) : prompt;
      await hostPage.sendMessage(message);
      return hostPage.waitForAppIframe(options);
    };

    /**
     * Switch the browser's color scheme and wait for the app to apply the new theme.
     * Use this to test both light and dark mode within a single test after invoke(),
     * avoiding a second tool invocation and resource refresh.
     *
     * @param {'light'|'dark'} scheme
     * @param {object} [appFrame] - FrameLocator returned by invoke(). When provided,
     *   waits for data-theme on the app's <html> to confirm the theme propagated.
     */
    fixture.setColorScheme = async (scheme, appFrame) => {
      await page.emulateMedia({ colorScheme: scheme });
      if (appFrame) {
        try {
          await appFrame.locator(`html[data-theme="${scheme}"]`).waitFor({ timeout: 10_000 });
        } catch {
          // App may not set data-theme; fall back to a short settle wait
          await page.waitForTimeout(1_500);
        }
      }
    };

    await use(fixture);
  },
});

export { test, expect };
