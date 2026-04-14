/**
 * Playwright fixtures for testing MCP servers.
 *
 * Two fixtures, cleanly separated:
 * - `mcp` — MCP protocol primitives (callTool, listTools, listResources, readResource)
 * - `inspector` — sunpeak inspector for rendering and visual testing (renderTool, host)
 *
 * Usage:
 *   import { test, expect } from 'sunpeak/test';
 *
 *   test('protocol test', async ({ mcp }) => {
 *     const tools = await mcp.listTools();
 *     const result = await mcp.callTool('search', { query: 'headphones' });
 *     expect(result.isError).toBeFalsy();
 *   });
 *
 *   test('UI test', async ({ inspector }) => {
 *     const result = await inspector.renderTool('search', { query: 'headphones' });
 *     expect(result).not.toBeError();
 *     await expect(result.app().getByText('headphones')).toBeVisible();
 *     await result.screenshot('search-results');
 *   });
 */
import { resolvePlaywrightESM } from '../live/utils.mjs';
import { registerMatchers } from './matchers.mjs';

const projectRoot = process.env.SUNPEAK_PROJECT_ROOT || process.cwd();
const { test: base, expect } = await resolvePlaywrightESM(projectRoot);

// Register MCP-native matchers
registerMatchers(expect);

// ── Helpers ──

function buildInspectorUrl(params) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      sp.set(key, String(value));
    }
  }
  sp.set('devOverlay', 'false');
  const qs = sp.toString();
  return qs ? `/?${qs}` : '/';
}

function resolveHostId(projectName) {
  if (!projectName) return 'chatgpt';
  if (projectName.startsWith('chatgpt')) return 'chatgpt';
  if (projectName.startsWith('claude')) return 'claude';
  return projectName;
}

async function fetchJson(page, path) {
  const baseURL = page.context()._options?.baseURL || '';
  const response = await page.request.get(`${baseURL}${path}`);
  if (!response.ok()) {
    throw new Error(`${path} returned ${response.status()}: ${await response.text()}`);
  }
  return response.json();
}

/**
 * Read the tool result from the inspector's <script id="__tool-result"> element.
 */
async function readToolResult(page, timeout) {
  try {
    const script = page.locator('#__tool-result');
    await script.waitFor({ state: 'attached', timeout: Math.min(timeout, 5_000) });
    const json = await script.evaluate(
      (el, t) =>
        new Promise((resolve) => {
          const check = () => {
            const text = el.textContent?.trim();
            if (text && text !== 'null') return resolve(text);
            let timer;
            const observer = new MutationObserver(() => {
              const updated = el.textContent?.trim();
              if (updated && updated !== 'null') {
                observer.disconnect();
                clearTimeout(timer);
                resolve(updated);
              }
            });
            observer.observe(el, { childList: true, characterData: true, subtree: true });
            timer = setTimeout(() => { observer.disconnect(); resolve(null); }, t);
          };
          check();
        }),
      Math.min(timeout, 10_000)
    );
    if (json) {
      const parsed = JSON.parse(json);
      return {
        content: parsed?.content || [],
        structuredContent: parsed?.structuredContent,
        isError: parsed?.isError || false,
        source: parsed?.source || 'server',
      };
    }
  } catch {
    // Fall back to empty
  }
  return { content: [], structuredContent: undefined, isError: false, source: 'server' };
}

/**
 * Create an InspectorResult from the rendered state.
 */
function createInspectorResult(page, resultData) {
  return {
    content: resultData?.content || [],
    structuredContent: resultData?.structuredContent,
    isError: resultData?.isError || false,
    source: resultData?.source || 'server',

    /** Get a FrameLocator for the rendered resource UI (handles double-iframe). */
    app() {
      return page.frameLocator('iframe').frameLocator('iframe');
    },

    /**
     * Take a screenshot and compare against a baseline.
     * Only runs when visual testing is enabled (`sunpeak test --visual`).
     * Silently skips otherwise.
     *
     * @param {string} [name] - Snapshot name (auto-generated if omitted)
     * @param {Object} [options] - Playwright toHaveScreenshot options
     */
    async screenshot(name, options = {}) {
      if (process.env.SUNPEAK_VISUAL !== 'true') return;

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
      const args = fullName ? [fullName, playwrightOptions] : [playwrightOptions];
      await expect(locator).toHaveScreenshot(...args);
    },
  };
}

// ── Fixtures ──

const test = base.extend({
  /**
   * MCP protocol fixture. Maps 1:1 to MCP protocol operations.
   * No rendering, no inspector UI, no sunpeak concepts.
   */
  mcp: async ({ page }, use) => {
    const fixture = {
      async listTools() {
        const result = await fetchJson(page, '/__sunpeak/list-tools');
        return result.tools || [];
      },

      async callTool(name, input) {
        const baseURL = page.context()._options?.baseURL || '';
        const response = await page.request.post(`${baseURL}/__sunpeak/call-tool`, {
          data: { name, arguments: input || {} },
        });
        if (!response.ok()) {
          throw new Error(`callTool(${name}) returned ${response.status()}: ${await response.text()}`);
        }
        return response.json();
      },

      async listResources() {
        const result = await fetchJson(page, '/__sunpeak/list-resources');
        return result.resources || [];
      },

      async readResource(uri) {
        const baseURL = page.context()._options?.baseURL || '';
        const response = await page.request.get(
          `${baseURL}/__sunpeak/read-resource?uri=${encodeURIComponent(uri)}`
        );
        if (!response.ok()) {
          throw new Error(`readResource(${uri}) returned ${response.status()}: ${await response.text()}`);
        }
        return response.text();
      },
    };

    await use(fixture);
  },

  /**
   * sunpeak inspector fixture. Renders tools in simulated host environments.
   * Built on top of the inspector, not the MCP protocol.
   */
  inspector: async ({ page }, use, testInfo) => {
    const host = resolveHostId(testInfo.project.name);

    const fixture = {
      /** Current host ID ('chatgpt' or 'claude') from Playwright project. */
      host,

      /** The underlying Playwright Page (for advanced assertions). */
      page,

      /**
       * Render a tool in the inspector and return the result.
       *
       * With `input`, the tool is called on the real server (bypasses fixtures).
       * Without `input`, simulation fixture data is used when available.
       *
       * @param {string} name - Tool name
       * @param {Record<string, unknown>} [input] - Tool arguments (real server call)
       * @param {Object} [options] - Display options
       * @param {'light' | 'dark'} [options.theme]
       * @param {'inline' | 'pip' | 'fullscreen'} [options.displayMode]
       * @param {number} [options.timeout] - Timeout in ms (default: 15s or mcpTimeout from config)
       * @returns {Promise<InspectorResult>}
       */
      async renderTool(name, input, options = {}) {
        const { theme, displayMode, timeout: callTimeout, ...rest } = options;

        const hasInput = input != null && Object.keys(input).length > 0;
        const params = {
          ...(hasInput ? { tool: name, toolInput: JSON.stringify(input) } : { simulation: name }),
          autoRun: 'true',
          host,
          ...(theme && { theme }),
          ...(displayMode && { displayMode }),
          ...rest,
        };

        await page.goto(buildInspectorUrl(params));

        const resolvedTimeout = callTimeout ?? testInfo.project.use?.mcpTimeout ?? 15_000;
        try {
          const frame = page.frameLocator('iframe').frameLocator('iframe');
          await frame.locator('body').waitFor({ state: 'attached', timeout: resolvedTimeout });
        } catch {
          // Tool may not have a resource (no UI)
        }

        const resultData = await readToolResult(page, resolvedTimeout);
        return createInspectorResult(page, resultData);
      },
    };

    await use(fixture);
  },
});

export { test, expect };
