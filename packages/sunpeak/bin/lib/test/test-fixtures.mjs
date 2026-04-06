/**
 * MCP-first Playwright fixtures for testing MCP servers.
 *
 * Provides an `mcp` fixture that abstracts the inspector, double-iframe
 * traversal, URL construction, and host selection. Tests read like MCP
 * operations, not browser automation.
 *
 * Usage:
 *   import { test, expect } from 'sunpeak/test';
 *
 *   test('weather tool', async ({ mcp }) => {
 *     const result = await mcp.callTool('get-weather', { city: 'SF' });
 *     expect(result).not.toBeError();
 *     expect(result).toHaveTextContent('temperature');
 *
 *     const app = result.app();
 *     await expect(app.getByText('San Francisco')).toBeVisible();
 *   });
 */
import { resolvePlaywrightESM } from '../live/utils.mjs';
import { registerMatchers } from './matchers.mjs';

const projectRoot = process.env.SUNPEAK_PROJECT_ROOT || process.cwd();
const { test: base, expect } = await resolvePlaywrightESM(projectRoot);

// Register MCP-native matchers
registerMatchers(expect);

/**
 * Build an inspector URL path with query parameters.
 * Inlined to avoid importing from dist (which pulls in React).
 */
function buildInspectorUrl(params) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      sp.set(key, String(value));
    }
  }
  // Always disable dev overlay in tests
  sp.set('devOverlay', 'false');
  const qs = sp.toString();
  return qs ? `/?${qs}` : '/';
}

/**
 * Resolve the host ID from the Playwright project name.
 */
function resolveHostId(projectName) {
  if (!projectName) return 'chatgpt';
  if (projectName.startsWith('chatgpt')) return 'chatgpt';
  if (projectName.startsWith('claude')) return 'claude';
  return projectName;
}

/**
 * Create a ToolResult wrapper around the inspector's rendered state.
 */
function createToolResult(page, resultData) {
  return {
    content: resultData?.content || [],
    structuredContent: resultData?.structuredContent,
    isError: resultData?.isError || false,

    /**
     * Get a FrameLocator for the rendered resource UI.
     * Handles the double-iframe traversal (outer sandbox proxy + inner app).
     * Returns the locator regardless — Playwright will throw with a clear
     * error if no iframe exists when you interact with it.
     */
    app() {
      return page.frameLocator('iframe').frameLocator('iframe');
    },
  };
}

const test = base.extend({
  mcp: async ({ page }, use, testInfo) => {
    const host = resolveHostId(testInfo.project.name);

    const fixture = {
      page,
      host,

      /**
       * Call a tool and get the rendered result.
       *
       * For sunpeak projects: navigates to the matching simulation (simulation
       * fixture data including toolInput is served by sunpeak dev).
       * For external servers: navigates to the matching simulation created by
       * inspectServer from discovered tools.
       *
       * Note: The `input` parameter is accepted for API consistency and future
       * use but is not currently passed to the inspector. Simulation fixture
       * data provides the tool input for rendering.
       *
       * @param {string} name - Tool/simulation name (e.g., 'show-albums')
       * @param {Record<string, unknown>} [_input] - Reserved for future use
       * @param {Object} [options] - Display options
       * @returns {Promise<ToolResult>}
       */
      async callTool(name, _input, options = {}) {
        const { theme, displayMode, ...rest } = options;

        const params = {
          simulation: name,
          host,
          ...(theme && { theme }),
          ...(displayMode && { displayMode }),
          ...rest,
        };

        await page.goto(buildInspectorUrl(params));

        // Wait for the resource iframe to have content
        try {
          const frame = page.frameLocator('iframe').frameLocator('iframe');
          await frame.locator('body').waitFor({ state: 'attached', timeout: 15_000 });
        } catch {
          // Tool may not have a resource (no UI)
        }

        return createToolResult(page, {
          content: [],
          structuredContent: undefined,
          isError: false,
        });
      },

      /**
       * Navigate to a tool with no mock data ("Press Run" state).
       * Use for testing the empty/loading state before a tool is executed.
       */
      async openTool(name, options = {}) {
        const { theme, ...rest } = options;
        const params = {
          tool: name,
          host,
          ...(theme && { theme }),
          ...rest,
        };
        await page.goto(buildInspectorUrl(params));
        await page.locator('#root').waitFor({ state: 'attached' });
      },

      /**
       * Click the Run button and wait for the resource to render.
       * Use after openTool() in Prod Tools mode.
       */
      async runTool() {
        await page.locator('button:has-text("Run")').click();
        await page.locator('iframe').waitFor({ state: 'attached', timeout: 30_000 });
        return createToolResult(page, {
          content: [],
          structuredContent: undefined,
          isError: false,
        });
      },

      /**
       * Change the theme via the sidebar toggle.
       */
      async setTheme(theme) {
        const label = theme === 'light' ? 'Light' : 'Dark';
        const button = page.locator(`button:has-text("${label}")`);
        if (await button.isVisible().catch(() => false)) {
          await button.click();
          // Wait for theme to propagate to the iframe
          await page.waitForTimeout(300);
        }
      },

      /**
       * Change the display mode via the sidebar buttons.
       */
      async setDisplayMode(mode) {
        const labels = { inline: 'Inline', pip: 'PiP', fullscreen: 'Full' };
        const label = labels[mode] || mode;
        await page.locator(`button:has-text("${label}")`).click();
        // Wait for display mode transition
        await page.waitForTimeout(500);
      },

      /**
       * Take a screenshot and compare against a baseline.
       * Only performs the comparison when visual testing is enabled
       * (`sunpeak test --visual`). Silently skips otherwise, so tests
       * that include screenshot() calls still pass during normal runs.
       *
       * Accepts all Playwright toHaveScreenshot() options (threshold,
       * maxDiffPixelRatio, maxDiffPixels, mask, animations, caret,
       * fullPage, clip, scale, stylePath, etc.) and passes them through.
       *
       * @param {string} [name] - Snapshot name (auto-generated from test title if omitted)
       * @param {Object} [options] - Screenshot and comparison options
       * @param {'app' | 'page'} [options.target='app'] - What to screenshot
       * @param {import('@playwright/test').Locator} [options.element] - Specific locator to screenshot
       */
      async screenshot(name, options = {}) {
        if (process.env.SUNPEAK_VISUAL !== 'true') return;

        // Support screenshot(options) without a name
        if (typeof name === 'object' && name !== null) {
          options = name;
          name = undefined;
        }

        const { target = 'app', element, ...playwrightOptions } = options;

        let locator;
        if (element) {
          locator = element;
        } else if (target === 'page') {
          locator = page.locator('#root');
        } else {
          locator = page.frameLocator('iframe').frameLocator('iframe').locator('body');
        }

        const fullName = name && !name.endsWith('.png') ? `${name}.png` : name;
        const args = fullName
          ? [fullName, playwrightOptions]
          : [playwrightOptions];

        await expect(locator).toHaveScreenshot(...args);
      },
    };

    await use(fixture);
  },
});

export { test, expect };
