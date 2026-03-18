/**
 * Playwright fixtures for live ChatGPT testing.
 *
 * Provides a `chatgpt` fixture that handles login, MCP server refresh,
 * and app name prefixing — so user test files only need assertions.
 *
 * Usage:
 *   import { test, expect } from 'sunpeak/test/chatgpt';
 *
 *   test('my resource renders', async ({ chatgpt }) => {
 *     const app = await chatgpt.invoke('show me something');
 *     await expect(app.locator('img').first()).toBeVisible();
 *   });
 */
import { ChatGPTPage } from './chatgpt-page.mjs';
import { createHostFixtures } from './host-fixtures.mjs';

const { test, expect } = createHostFixtures({
  fixtureName: 'chatgpt',
  HostPageClass: ChatGPTPage,
  /** ChatGPT requires /{appName} prefix to invoke MCP apps. */
  formatMessage: (appName, text) => `/${appName} ${text}`,
});

export { test, expect };
