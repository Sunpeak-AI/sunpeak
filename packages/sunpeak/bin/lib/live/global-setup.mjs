/**
 * Global setup for live tests.
 *
 * Runs exactly once before all workers. Two responsibilities:
 *  1. Authenticate — launch a browser, verify login, wait for user if needed.
 *  2. Refresh MCP server — navigate to host settings and click Refresh so
 *     all workers start with pre-loaded resources.
 *
 * Auth approach:
 *  - Opens a browser with storageState if a fresh auth file exists (<24h).
 *  - Checks that we're truly logged in (profile button visible AND no "Log in" buttons).
 *  - If not logged in, prints a clear message and waits for the user to log in
 *    in the open browser window (up to 5 minutes).
 *  - Saves storageState after successful login for future runs.
 *  - The same browser session is reused for MCP refresh so Cloudflare's
 *    HttpOnly cookies (which storageState can't capture) remain valid.
 *
 * This file is referenced by the Playwright config created by defineLiveConfig().
 * The auth file path is passed via SUNPEAK_AUTH_FILE env var.
 */
import { existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { dirname } from 'path';
import { ANTI_BOT_ARGS, CHROME_USER_AGENT, resolvePlaywright, getAppName } from './utils.mjs';
import { ChatGPTPage, CHATGPT_SELECTORS, CHATGPT_URLS } from './chatgpt-page.mjs';

/**
 * Auth file retention window. The file is kept for 24 hours, but sessions
 * typically expire much sooner (a few hours) because Cloudflare's HttpOnly
 * `cf_clearance` cookie cannot be captured by storageState(). When it
 * expires, the next run will need re-authentication even if the file is fresh.
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const CHATGPT_URL = CHATGPT_URLS.base;

function isAuthFresh(authFile) {
  if (!existsSync(authFile)) return false;
  const age = Date.now() - statSync(authFile).mtimeMs;
  return age < MAX_AGE_MS;
}

/**
 * Check if we're truly logged into ChatGPT.
 * Must have the profile button AND must NOT have any "Log in" buttons.
 * The logged-out ChatGPT page can show some UI elements that look like
 * a logged-in state, so checking just the profile button isn't enough.
 */
async function isFullyLoggedIn(page) {
  const hasProfile = await page
    .locator(CHATGPT_SELECTORS.loggedInIndicator)
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasProfile) return false;

  // Must NOT have "Log in" buttons — these appear on the logged-out page
  const hasLoginButton = await page
    .locator(CHATGPT_SELECTORS.loginPage)
    .first()
    .isVisible()
    .catch(() => false);

  return !hasLoginButton;
}

export default async function globalSetup() {
  const authFile = process.env.SUNPEAK_AUTH_FILE;

  if (process.env.SUNPEAK_STORAGE_STATE) {
    return;
  }

  if (!authFile) {
    console.warn('SUNPEAK_AUTH_FILE not set — skipping auth setup.');
    return;
  }

  const projectRoot = process.env.SUNPEAK_PROJECT_ROOT || process.cwd();
  const appName = getAppName(projectRoot);
  const { chromium } = resolvePlaywright(projectRoot);

  // Launch a browser. Use saved storageState if fresh, otherwise start clean.
  const hasFreshAuth = isAuthFresh(authFile);
  const browser = await chromium.launch({
    headless: false,
    args: ANTI_BOT_ARGS,
  });
  const context = await browser.newContext({
    userAgent: CHROME_USER_AGENT,
    ...(hasFreshAuth ? { storageState: authFile } : {}),
  });
  const page = await context.newPage();

  try {
    await page.goto(CHATGPT_URL, { waitUntil: 'domcontentloaded' });

    // Wait for page to settle — Cloudflare challenge or ChatGPT UI loading
    await page.waitForTimeout(5_000);

    // Check if truly logged in (profile button visible, no "Log in" buttons)
    let loggedIn = await isFullyLoggedIn(page);

    if (loggedIn) {
      console.log('Authenticated (from saved session).');
    } else {
      // If we loaded a stale auth file that didn't work, delete it
      if (hasFreshAuth) {
        try { unlinkSync(authFile); } catch {}
      }

      console.log(
        `\n` +
        `╔══════════════════════════════════════════════════════════════╗\n` +
        `║  Please log in to ChatGPT                                  ║\n` +
        `║                                                            ║\n` +
        `║  A browser window has opened at chatgpt.com.               ║\n` +
        `║  Log in and wait for the chat to load.                     ║\n` +
        `║                                                            ║\n` +
        `║  Waiting up to 5 minutes...                                ║\n` +
        `╚══════════════════════════════════════════════════════════════╝\n`
      );

      // Poll until truly logged in
      const maxWait = 300_000; // 5 minutes
      const pollInterval = 3_000;
      const start = Date.now();

      while (Date.now() - start < maxWait) {
        loggedIn = await isFullyLoggedIn(page);
        if (loggedIn) break;
        await page.waitForTimeout(pollInterval);
      }

      if (!loggedIn) {
        throw new Error(
          'Login timed out after 5 minutes.\n' +
          'Please log in to chatgpt.com in the browser window that opened.\n' +
          'If the session expired, delete the .auth/ directory and try again.'
        );
      }
      console.log('Logged in!');
    }

    // Save session for future runs (best effort — HttpOnly cookies won't be captured).
    mkdirSync(dirname(authFile), { recursive: true });
    await context.storageState({ path: authFile });
    console.log('Session saved.\n');

    // Refresh MCP server in the SAME browser session.
    // This is critical — Cloudflare's cf_clearance cookie is HttpOnly and
    // won't be in the saved storageState. By refreshing here, the cookie
    // is still valid for navigating to settings.
    //
    // This MUST succeed — if the MCP server isn't reachable or the refresh
    // fails, tests will fail with confusing iframe/timeout errors.
    const hostPage = new ChatGPTPage(page);
    await hostPage.refreshMcpServer({ appName });
    console.log('MCP server refreshed.');
  } finally {
    await browser.close();
  }
}
