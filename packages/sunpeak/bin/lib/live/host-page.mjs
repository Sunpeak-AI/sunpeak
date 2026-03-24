/**
 * Base class for host page objects (ChatGPT, Claude, etc.).
 *
 * Each host subclass provides:
 *   - selectors: DOM selectors for the host's UI
 *   - urls: host-specific URLs
 *   - Host-specific overrides for login detection, MCP refresh, iframe access
 *
 * Shared behavior (sendMessage flow, screenshot debugging, selector health checks)
 * lives here and is inherited by all hosts.
 */

/**
 * @typedef {Object} HostSelectors
 * @property {string} chatInput - Chat input field
 * @property {string} sendButton - Send message button
 * @property {string} newChatLink - "New chat" link/button
 * @property {string} loggedInIndicator - Element visible when logged in
 * @property {string} loginPage - Element visible on login page
 * @property {string} stopButton - Streaming stop button
 */

/**
 * @typedef {Object} HostUrls
 * @property {string} base - Host base URL (e.g., 'https://chatgpt.com')
 * @property {string} settings - MCP settings URL
 * @property {string} loginTestId - Test ID for login detection (if using getByTestId)
 */

export class HostPage {
  /**
   * @param {import('playwright').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  /** @returns {string} Host identifier ('chatgpt' | 'claude') */
  get hostId() {
    throw new Error('Subclass must implement hostId');
  }

  /** @returns {string} Host display name */
  get hostName() {
    throw new Error('Subclass must implement hostName');
  }

  /** @returns {HostSelectors} */
  get selectors() {
    throw new Error('Subclass must implement selectors');
  }

  /** @returns {HostUrls} */
  get urls() {
    throw new Error('Subclass must implement urls');
  }

  /**
   * Check that key selectors still resolve on the current page.
   * Logs warnings instead of failing so tests can still attempt to run.
   */
  async checkSelectorsHealth() {
    const criticalSelectors = [
      ['chatInput', this.selectors.chatInput],
      ['loggedInIndicator', this.selectors.loggedInIndicator],
    ];

    const warnings = [];
    for (const [name, selector] of criticalSelectors) {
      try {
        const count = await this.page.locator(selector).first().count();
        if (count === 0) {
          warnings.push(`  "${name}" selector not found: ${selector}`);
        }
      } catch {
        warnings.push(`  "${name}" selector error: ${selector}`);
      }
    }

    if (warnings.length > 0) {
      console.warn(
        `\n⚠️  ${this.hostName} DOM may have changed — update selectors in ${this.hostId}-page.mjs:\n` +
        warnings.join('\n') + '\n'
      );
    }

    return warnings.length === 0;
  }

  /**
   * Check if truly logged in: profile button visible AND no "Log in" buttons.
   * The logged-out page can show UI elements that look like a logged-in state
   * (e.g., sidebar with profile-like elements), so checking just the profile
   * button isn't enough.
   */
  async _isFullyLoggedIn() {
    const hasProfile = await this.page
      .locator(this.selectors.loggedInIndicator)
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasProfile) return false;

    const hasLoginButton = await this.page
      .locator(this.selectors.loginPage)
      .first()
      .isVisible()
      .catch(() => false);

    return !hasLoginButton;
  }

  /**
   * Verify the user is logged into the host.
   * Navigates to the host if not already there.
   *
   * If not logged in, waits up to 3 minutes for the user to complete login
   * in the open browser window, polling every 5 seconds. This handles the
   * case where storageState doesn't capture Cloudflare's HttpOnly cookies
   * and the browser needs a fresh login.
   */
  async verifyLoggedIn() {
    const url = this.page.url();
    if (!url.includes(new URL(this.urls.base).hostname)) {
      await this.page.goto(this.urls.base, { waitUntil: 'domcontentloaded' });
    }

    // Wait for the page to settle (Cloudflare challenge or UI loading)
    await this.page.waitForTimeout(5_000);

    // Quick check: truly logged in? (profile button AND no "Log in" buttons)
    if (await this._isFullyLoggedIn()) return;

    // Not logged in. Wait for the user to authenticate in this browser window.
    console.log(
      `\n` +
      `╔══════════════════════════════════════════════════════════════╗\n` +
      `║  Not logged into ${this.hostName.padEnd(42)}║\n` +
      `║                                                            ║\n` +
      `║  Please log in at: ${this.urls.base.padEnd(39)}║\n` +
      `║  in the browser window that just opened.                   ║\n` +
      `║                                                            ║\n` +
      `║  Waiting up to 3 minutes...                                ║\n` +
      `╚══════════════════════════════════════════════════════════════╝\n`
    );

    // Poll for login — the user may need to pass Cloudflare + enter credentials
    const maxWait = 180_000; // 3 minutes
    const pollInterval = 5_000;
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      if (await this._isFullyLoggedIn()) {
        console.log(`Logged into ${this.hostName}!\n`);
        return;
      }
      await this.page.waitForTimeout(pollInterval);
    }

    throw new Error(
      `Login to ${this.hostName} timed out after 3 minutes.\n` +
      `Please log in at ${this.urls.base} in the browser window and try again.\n` +
      'If the session expired, delete the .auth/ directory and try again.'
    );
  }

  /**
   * Refresh the MCP server connection in host settings.
   * Subclasses must implement this — each host has different settings UI.
   *
   * @param {Object} [options]
   * @param {string} [options.tunnelUrl] - Tunnel URL for error messages
   * @param {string} [options.appName] - App name as configured in the host
   */
  async refreshMcpServer(_options) {
    throw new Error(`${this.hostName} refreshMcpServer not implemented`);
  }

  /**
   * Start a new chat conversation.
   */
  async startNewChat() {
    // Navigate directly rather than clicking — ChatGPT's sidebar compact
    // icon can overlay the "New chat" link and intercept pointer events.
    await this.page.goto(this.urls.base, { waitUntil: 'domcontentloaded' });
    await this.page.locator(this.selectors.chatInput).waitFor({ timeout: 10_000 });
  }

  /**
   * Send a message in the current chat.
   * @param {string} text - The message to send
   */
  async sendMessage(text) {
    const input = this.page.locator(this.selectors.chatInput);
    await input.waitFor({ timeout: 10_000 });
    await input.click();

    // Use keyboard typing — host React textareas often don't respond to fill()
    await input.pressSequentially(text, { delay: 10 });

    const sendBtn = this.page.locator(this.selectors.sendButton);
    await sendBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await sendBtn.click();
  }

  /**
   * Wait for a MCP app iframe to appear in the conversation.
   * Subclasses must implement this — each host renders iframes differently.
   *
   * @param {Object} [options]
   * @param {number} [options.timeout=90000] - Max time to wait (ms)
   * @returns {Promise<import('playwright').FrameLocator>}
   */
  async waitForAppIframe(_options) {
    throw new Error(`${this.hostName} waitForAppIframe not implemented`);
  }

  /**
   * Get the app iframe FrameLocator.
   * @returns {import('playwright').FrameLocator}
   */
  getAppIframe() {
    throw new Error(`${this.hostName} getAppIframe not implemented`);
  }

  /**
   * Capture a debug screenshot and throw with helpful message.
   * @param {string} context - Context label for the screenshot filename
   * @param {string} [tunnelUrl] - Tunnel URL for the error message
   * @protected
   */
  async _screenshotAndThrow(context, tunnelUrl) {
    const screenshotPath = `/tmp/sunpeak-live-debug-${this.hostId}-${context}.png`;
    try {
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.error(`\nDebug screenshot saved to: ${screenshotPath}`);
    } catch {
      // Screenshot failed — continue with the error
    }

    try {
      const buttons = await this.page.locator('button').allTextContents();
      console.error('Visible buttons on page:', buttons.filter(t => t.trim()).join(', '));
    } catch {
      // Best effort
    }

    throw new Error(
      `Could not find Refresh/Reconnect button in ${this.hostName} settings.\n` +
      `Make sure your MCP server is added in ${this.hostName} settings` +
      (tunnelUrl ? ` with URL: ${tunnelUrl}/mcp` : '') +
      `\n\nDebug screenshot: ${screenshotPath}`
    );
  }

  /**
   * Wait for a toast/alert banner and check for errors.
   * Many hosts show success/error toasts after settings actions.
   * @param {Object} [options]
   * @param {string} [options.alertSelector='[role="alert"]'] - Selector for toast elements
   * @param {number} [options.timeout=30000] - Max time to wait
   * @param {number} [options.minTextLength=5] - Minimum text length to consider as a real toast
   * @protected
   */
  async _waitForToast({ alertSelector = '[role="alert"]', timeout = 30_000, minTextLength = 5 } = {}) {
    try {
      await this.page.waitForFunction(
        ({ selector, minLen }) => {
          const alerts = document.querySelectorAll(selector);
          for (const alert of alerts) {
            const text = alert.textContent?.trim();
            if (text && text.length > minLen) return true;
          }
          return false;
        },
        { selector: alertSelector, minLen: minTextLength },
        { timeout },
      );
    } catch {
      console.warn('No toast detected — assuming success.');
      return { texts: [], hasError: false };
    }

    const texts = await this.page.locator(alertSelector).allTextContents();
    const errorText = texts.find((t) => /error/i.test(t));
    return { texts, hasError: !!errorText, errorText };
  }
}
