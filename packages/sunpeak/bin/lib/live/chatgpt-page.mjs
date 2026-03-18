/**
 * ChatGPT host page object for live testing.
 *
 * All ChatGPT-specific DOM selectors and interaction logic lives here.
 * When ChatGPT updates their UI, only this file needs updating.
 *
 * Extends HostPage which provides shared behavior (sendMessage, login, etc.).
 */
import { HostPage } from './host-page.mjs';

/**
 * All ChatGPT DOM selectors in one place for easy maintenance.
 *
 * Last verified: 2026-03-17 via live Playwright inspection.
 */
const SELECTORS = {
  // Chat interface
  chatInput: '#prompt-textarea',
  sendButton: '[data-testid="send-button"]',
  newChatLink: 'a:has-text("New chat")',

  // Login detection — ChatGPT renders two profile buttons (sidebar compact + expanded); always use .first().
  loggedInIndicator: '[data-testid="accounts-profile-button"]',
  loginPage: 'button:has-text("Log in")',

  // Settings navigation
  appsTab: '[role="tab"]:has-text("Apps")',
  refreshButton: 'button:has-text("Refresh")',
  reconnectButton: 'button:has-text("Reconnect")',

  // App iframe — ChatGPT uses a nested iframe structure:
  //   outer: iframe[sandbox] (connector sandbox, no direct content)
  //   inner: iframe name="root" (actual app React content)
  mcpAppOuterIframe: 'iframe[sandbox*="allow-scripts"]',
  mcpAppInnerFrameName: 'root',

  // Streaming indicator
  stopButton: 'button[aria-label="Stop streaming"], button:has-text("Stop")',
};

const URLS = {
  base: 'https://chatgpt.com',
  settings: 'https://chatgpt.com/#settings/Connectors',
};

export { SELECTORS as CHATGPT_SELECTORS, URLS as CHATGPT_URLS };

export class ChatGPTPage extends HostPage {
  get hostId() { return 'chatgpt'; }
  get hostName() { return 'ChatGPT'; }
  get selectors() { return SELECTORS; }
  get urls() { return URLS; }

  /**
   * Refresh the MCP server connection in ChatGPT settings.
   * Navigates to Settings > Apps, clicks the app entry, clicks Refresh,
   * and waits for the success/error toast.
   */
  async refreshMcpServer({ tunnelUrl, appName } = {}) {
    await this.page.goto(URLS.settings, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(3_000);

    const found = await this._findAndClickRefresh(appName);

    if (!found) {
      const appsTab = this.page.locator(SELECTORS.appsTab);
      const hasAppsTab = await appsTab.isVisible().catch(() => false);
      if (hasAppsTab) {
        await appsTab.click();
        await this.page.waitForTimeout(2_000);
        const retryFound = await this._findAndClickRefresh(appName);
        if (!retryFound) {
          await this._screenshotAndThrow('refresh-mcp-settings', tunnelUrl);
        }
      } else {
        await this._screenshotAndThrow('no-apps-tab', tunnelUrl);
      }
    }

    // Wait for the refresh toast
    const { hasError, errorText } = await this._waitForToast();
    if (hasError) {
      throw new Error(
        `MCP server refresh failed in ChatGPT:\n${errorText.trim()}\n\n` +
        `Make sure your MCP dev server is running (pnpm dev) and your tunnel is active.`
      );
    }

    // Wait for resource preloading to complete
    await this.page.waitForTimeout(3_000);

    // Navigate back to chat
    await this.page.goto(URLS.base, { waitUntil: 'domcontentloaded' });
    await this.page.locator(SELECTORS.chatInput).waitFor({ timeout: 10_000 });
  }

  /**
   * Wait for a MCP app iframe to appear in the conversation.
   * ChatGPT renders apps in a nested iframe (outer sandbox > inner #root).
   */
  async waitForAppIframe({ timeout = 90_000 } = {}) {
    // Wait for streaming to finish
    try {
      await this.page.locator(SELECTORS.stopButton).waitFor({ state: 'hidden', timeout });
    } catch {
      // Stop button may never appear if response was instant
    }

    // Wait for the outer sandbox iframe
    await this.page.locator(SELECTORS.mcpAppOuterIframe).first().waitFor({ state: 'attached', timeout: 30_000 });

    // Wait for the inner frame to appear inside the sandboxed outer iframe.
    // waitForFunction can't cross the sandbox boundary, so use Playwright's frameLocator instead.
    const outerFrame = this.page.frameLocator(SELECTORS.mcpAppOuterIframe).first();
    await outerFrame
      .locator(`iframe[name="${SELECTORS.mcpAppInnerFrameName}"], iframe#${SELECTORS.mcpAppInnerFrameName}`)
      .waitFor({ state: 'attached', timeout: 15_000 });

    const appFrame = this.getAppIframe();

    // Wait for content to render
    try {
      await appFrame.locator('body *').first().waitFor({ state: 'visible', timeout: 15_000 });
    } catch {
      // Caller's assertions will catch missing content
    }

    return appFrame;
  }

  getAppIframe() {
    const name = SELECTORS.mcpAppInnerFrameName;
    const outerFrame = this.page.frameLocator(SELECTORS.mcpAppOuterIframe).first();
    return outerFrame.frameLocator(`iframe[name="${name}"], iframe#${name}`);
  }

  /**
   * Send a message, pausing around the space after the /{appName} prefix.
   * ChatGPT needs a moment to associate the app before the rest of the prompt is typed.
   */
  async sendMessage(text) {
    const input = this.page.locator(SELECTORS.chatInput);
    await input.waitFor({ timeout: 10_000 });
    await input.click();

    if (text.startsWith('/')) {
      const spaceIdx = text.indexOf(' ');
      if (spaceIdx !== -1) {
        await input.pressSequentially(text.slice(0, spaceIdx), { delay: 10 });
        await this.page.waitForTimeout(500);
        await input.pressSequentially(' ', { delay: 10 });
        await this.page.waitForTimeout(500);
        await input.pressSequentially(text.slice(spaceIdx + 1), { delay: 10 });
      } else {
        await input.pressSequentially(text, { delay: 10 });
      }
    } else {
      await input.pressSequentially(text, { delay: 10 });
    }

    const sendBtn = this.page.locator(SELECTORS.sendButton);
    await sendBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await sendBtn.click();
  }

  // --- ChatGPT-specific private methods ---

  /** @private */
  async _findAndClickRefresh(appName) {
    const refreshBtn = this.page.locator(SELECTORS.refreshButton).first();
    const reconnectBtn = this.page.locator(SELECTORS.reconnectButton).first();

    const tryClickRefresh = async () => {
      if (await refreshBtn.isVisible().catch(() => false)) {
        await refreshBtn.click();
        return true;
      }
      if (await reconnectBtn.isVisible().catch(() => false)) {
        await reconnectBtn.click();
        return true;
      }
      return false;
    };

    if (await tryClickRefresh()) return true;

    if (appName) {
      const strategies = [
        () => this.page.getByText(appName, { exact: true }).first(),
        () => this.page.locator(`text=${appName}`).first(),
        () => this.page.locator(`a:has-text("${appName}"), [role="button"]:has-text("${appName}")`).first(),
      ];

      for (const getLocator of strategies) {
        try {
          const el = getLocator();
          if (await el.isVisible().catch(() => false)) {
            await el.click();
            await this.page.waitForTimeout(2_000);
            if (await tryClickRefresh()) return true;
          }
        } catch {
          // Strategy didn't work, try next
        }
      }
    }

    return false;
  }
}
