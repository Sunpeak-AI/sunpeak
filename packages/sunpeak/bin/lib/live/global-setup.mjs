/**
 * Global setup for live tests.
 *
 * Runs exactly once before all workers. Two responsibilities:
 *  1. Authenticate — import cookies from the user's real browser or open a
 *     manual login window. Session state is saved to disk for 24 hours.
 *  2. Refresh MCP server — navigate to host settings and click Refresh so
 *     all workers start with pre-loaded resources.
 *
 * This file is referenced by the Playwright config created by defineLiveConfig().
 * The auth file path is passed via SUNPEAK_AUTH_FILE env var.
 */
import { existsSync, mkdirSync, statSync } from 'fs';
import { dirname } from 'path';
import { ANTI_BOT_ARGS, CHROME_USER_AGENT, resolvePlaywright, getAppName } from './utils.mjs';
import { launchAuthenticatedBrowser, detectBrowser } from './browser-auth.mjs';
import { ChatGPTPage, CHATGPT_SELECTORS, CHATGPT_URLS } from './chatgpt-page.mjs';

/** Auth state expires after 24 hours — ChatGPT session cookies are short-lived. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Reuse selectors and URLs from the canonical ChatGPT page object. */
const CHATGPT_URL = CHATGPT_URLS.base;
const LOGIN_SELECTOR = CHATGPT_SELECTORS.loggedInIndicator;

function isAuthFresh(authFile) {
  if (!existsSync(authFile)) return false;
  const age = Date.now() - statSync(authFile).mtimeMs;
  return age < MAX_AGE_MS;
}

/**
 * Refresh the MCP server connection in ChatGPT settings.
 * Opens a browser with the saved auth, navigates to settings, clicks Refresh,
 * then closes. Runs once so parallel test workers don't each refresh.
 */
async function refreshMcpServer(authFile) {
  const projectRoot = process.env.SUNPEAK_PROJECT_ROOT || process.cwd();
  const appName = getAppName(projectRoot);
  const { chromium } = resolvePlaywright(projectRoot);

  const browser = await chromium.launch({
    headless: false,
    args: ANTI_BOT_ARGS,
  });
  const context = await browser.newContext({
    userAgent: CHROME_USER_AGENT,
    storageState: authFile,
  });
  const page = await context.newPage();

  try {
    const hostPage = new ChatGPTPage(page);
    await hostPage.refreshMcpServer({ appName });
    console.log('MCP server refreshed.');
  } finally {
    await browser.close();
  }
}

export default async function globalSetup() {
  // If storage state was provided externally, skip auth but still refresh.
  const authFile = process.env.SUNPEAK_AUTH_FILE;

  if (!process.env.SUNPEAK_STORAGE_STATE) {
    if (!authFile) {
      console.warn('SUNPEAK_AUTH_FILE not set — skipping auth setup.');
      return;
    }

    if (!isAuthFresh(authFile)) {
      await authenticate(authFile);
    }
  }

  // Refresh MCP server connection so all workers start with pre-loaded resources.
  const resolvedAuth = process.env.SUNPEAK_STORAGE_STATE || authFile;
  if (resolvedAuth && existsSync(resolvedAuth)) {
    await refreshMcpServer(resolvedAuth);
  }
}

/**
 * Authenticate by importing cookies from the user's browser or manual login.
 */
async function authenticate(authFile) {
  // Try importing cookies from the user's real browser profile.
  const browserName = process.env.SUNPEAK_LIVE_BROWSER || detectBrowser();
  if (browserName) {
    let auth;
    try {
      auth = await launchAuthenticatedBrowser({ browser: browserName, headless: false });
      const page = auth.page;

      await page.goto(CHATGPT_URL, { waitUntil: 'domcontentloaded' });

      const loggedIn = await page
        .locator(LOGIN_SELECTOR)
        .first()
        .waitFor({ timeout: 15_000 })
        .then(() => true)
        .catch(() => false);

      if (loggedIn) {
        mkdirSync(dirname(authFile), { recursive: true });
        await auth.context.storageState({ path: authFile });
        console.log(`Session imported from ${browserName} browser.`);
      }

      await auth.context.close();
      auth.cleanup();

      if (loggedIn) return;
      // Not logged in — fall through to manual login.
    } catch {
      // Profile copy failed — clean up and fall through to manual login.
      if (auth) {
        try { await auth.context.close(); } catch {}
        auth.cleanup();
      }
    }
  }

  // Fallback: open a bare browser for the user to log in manually.
  console.log('\nNo saved ChatGPT session found (or session expired).');
  console.log('Opening browser — please log in to chatgpt.com.\n');

  const projectRoot = process.env.SUNPEAK_PROJECT_ROOT || process.cwd();
  const { chromium } = resolvePlaywright(projectRoot);

  const browser = await chromium.launch({
    headless: false,
    args: ANTI_BOT_ARGS,
  });

  const context = await browser.newContext({
    userAgent: CHROME_USER_AGENT,
  });

  const page = await context.newPage();
  await page.goto(CHATGPT_URL, { waitUntil: 'domcontentloaded' });

  console.log('Waiting for login... (this will timeout after 5 minutes)\n');
  await page.locator(LOGIN_SELECTOR).first().waitFor({ timeout: 300_000 });
  console.log('Logged in! Saving session...\n');

  mkdirSync(dirname(authFile), { recursive: true });
  await context.storageState({ path: authFile });
  await browser.close();
}
