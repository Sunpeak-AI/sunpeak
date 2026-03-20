#!/usr/bin/env node
/**
 * Extract host runtime data from ChatGPT using the host-inspector resource.
 *
 * Uses the same live test infrastructure (ChatGPTPage) for selectors,
 * message sending, and iframe handling.
 *
 * Auth: Opens a browser and checks if you're logged in. If not, prints
 * a message and waits for you to log in. Same approach as pnpm test:live.
 *
 * Prerequisites:
 *   - MCP dev server running: SUNPEAK_LIVE_TEST=1 pnpm dev -- --prod-resources
 *   - The host-inspector resource must be registered
 *
 * Output: .context/chatgpt-host-data.json
 */
import { writeFileSync, mkdirSync, existsSync, statSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const OUTPUT_DIR = join(PROJECT_ROOT, '.context');
const OUTPUT_FILE = join(OUTPUT_DIR, 'chatgpt-host-data.json');
const AUTH_FILE = join(PROJECT_ROOT, '.auth', 'chatgpt.json');
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Import live test infrastructure
const require_ = createRequire(join(PROJECT_ROOT, 'package.json'));
const liveDir = join(PROJECT_ROOT, 'node_modules', 'sunpeak', 'bin', 'lib', 'live');

const { ANTI_BOT_ARGS, CHROME_USER_AGENT, getAppName } = await import(join(liveDir, 'utils.mjs'));
const { ChatGPTPage, CHATGPT_SELECTORS } = await import(join(liveDir, 'chatgpt-page.mjs'));
const { chromium } = require_('@playwright/test');

const appName = getAppName(PROJECT_ROOT);
console.log(`App name: ${appName}`);

// ── Auth ──────────────────────────────────────────────────────────────

function isAuthFresh() {
  if (!existsSync(AUTH_FILE)) return false;
  return (Date.now() - statSync(AUTH_FILE).mtimeMs) < MAX_AGE_MS;
}

/**
 * Check if truly logged in: profile button visible AND no "Log in" buttons.
 */
async function isFullyLoggedIn(pg) {
  const hasProfile = await pg.locator(CHATGPT_SELECTORS.loggedInIndicator).first()
    .isVisible().catch(() => false);
  if (!hasProfile) return false;
  const hasLoginBtn = await pg.locator(CHATGPT_SELECTORS.loginPage).first()
    .isVisible().catch(() => false);
  return !hasLoginBtn;
}

// Launch browser with saved session if available
const browser = await chromium.launch({ headless: false, args: ANTI_BOT_ARGS });
const context = await browser.newContext({
  userAgent: CHROME_USER_AGENT,
  ...(isAuthFresh() ? { storageState: AUTH_FILE } : {}),
});
const page = await context.newPage();

try {
  await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5_000);

  // Check if truly logged in (profile button AND no "Log in" buttons)
  let loggedIn = await isFullyLoggedIn(page);

  if (!loggedIn) {
    // Delete stale auth if it didn't work
    if (isAuthFresh()) {
      try { unlinkSync(AUTH_FILE); } catch {}
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

    const start = Date.now();
    while (Date.now() - start < 300_000) {
      loggedIn = await isFullyLoggedIn(page);
      if (loggedIn) break;
      await page.waitForTimeout(3_000);
    }
    if (!loggedIn) throw new Error('Login timed out after 5 minutes.');
    console.log('Logged in!');
  } else {
    console.log('Already logged in.');
  }

  // Save session for future runs (best effort — HttpOnly cookies won't be captured)
  mkdirSync(dirname(AUTH_FILE), { recursive: true });
  await context.storageState({ path: AUTH_FILE });

  const hostPage = new ChatGPTPage(page);

  // Refresh MCP server in the SAME browser session (Cloudflare cookies intact).
  // This MUST succeed — without a fresh refresh, the app won't have the latest
  // inspector resource and the extraction will fail.
  console.log('Refreshing MCP server...');
  await hostPage.refreshMcpServer({ appName });
  console.log('MCP server refreshed.');

  // Send the inspector command
  console.log('Sending inspector command...');
  await hostPage.sendMessage(`/${appName} inspect host`);
  console.log('Sent. Waiting for app iframe...');

  const appFrame = await hostPage.waitForAppIframe();
  await appFrame.locator('#__inspector-data').waitFor({ state: 'attached', timeout: 30_000 });
  console.log('Inspector rendered.');

  // --- Dark mode ---
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(2000);
  const darkJson = await appFrame.locator('#__inspector-data').textContent();
  if (!darkJson) throw new Error('Inspector data element was empty (dark mode)');
  const darkData = JSON.parse(darkJson);
  console.log('Captured dark mode.');
  const darkPageChrome = await extractPageChrome(page);

  // --- Light mode ---
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(2000);
  const lightJson = await appFrame.locator('#__inspector-data').textContent();
  if (!lightJson) throw new Error('Inspector data element was empty (light mode)');
  const lightData = JSON.parse(lightJson);
  console.log('Captured light mode.');
  const lightPageChrome = await extractPageChrome(page);

  // --- Display mode capture ---
  // Click "Fullscreen" button inside the inspector to switch modes, then capture.
  console.log('\n=== Display Mode Capture ===');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(1000);

  const displayModeSnapshots = {};
  // Inline is already captured above
  displayModeSnapshots.inline = {
    viewport: darkData.viewport,
    displayMode: darkData.displayMode,
    windowDimensions: darkData.windowDimensions,
    hostCapabilities: darkData.hostCapabilities,
  };
  console.log('  inline: captured (from main extraction)');

  // Switch to fullscreen by clicking the button inside the inspector iframe
  for (const mode of ['fullscreen', 'pip']) {
    try {
      const btn = appFrame.locator(`button:has-text("${mode === 'fullscreen' ? 'Fullscreen' : 'PiP'}")`);
      await btn.click({ timeout: 5000 });
      await page.waitForTimeout(3000);
      const json = await appFrame.locator('#__inspector-data').textContent({ timeout: 10000 });
      const data = JSON.parse(json);
      displayModeSnapshots[mode] = {
        viewport: data.viewport,
        displayMode: data.displayMode,
        windowDimensions: data.windowDimensions,
        availableDisplayModes: data.availableDisplayModes,
        hostCapabilities: data.hostCapabilities,
      };
      console.log(`  ${mode}: displayMode=${data.displayMode}, viewport=${JSON.stringify(data.viewport)}`);

      // Switch back to inline for the next test
      const inlineBtn = appFrame.locator('button:has-text("Inline")');
      await inlineBtn.click({ timeout: 5000 });
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log(`  ${mode}: capture failed (${e.message})`);
      displayModeSnapshots[mode] = null;
    }
  }

  // --- Multi-width capture ---
  console.log('\n=== Multi-Width Capture ===');
  const VIEWPORT_WIDTHS = [375, 425, 640, 768, 1024, 1280, 1440, 1920];
  const widthSnapshots = [];
  await page.emulateMedia({ colorScheme: 'dark' });
  for (const vw of VIEWPORT_WIDTHS) {
    await page.setViewportSize({ width: vw, height: 800 });
    await page.waitForTimeout(1500);
    try {
      const json = await appFrame.locator('#__inspector-data').textContent({ timeout: 5000 });
      const data = JSON.parse(json);
      const snapshot = {
        browserWidth: vw,
        maxWidth: data.viewport?.maxWidth ?? null,
        iframeWidth: data.windowDimensions?.innerWidth ?? null,
        iframeHeight: data.windowDimensions?.innerHeight ?? null,
      };
      widthSnapshots.push(snapshot);
      console.log(`  ${vw}px → maxWidth: ${snapshot.maxWidth}, iframeWidth: ${snapshot.iframeWidth}`);
    } catch {
      console.log(`  ${vw}px → (capture failed)`);
      widthSnapshots.push({ browserWidth: vw, maxWidth: null, iframeWidth: null, iframeHeight: null });
    }
  }

  // --- Write output ---
  const output = {
    capturedAt: new Date().toISOString(),
    dark: { inspector: darkData, pageChrome: darkPageChrome },
    light: { inspector: lightData, pageChrome: lightPageChrome },
    displayModeSnapshots,
    widthSnapshots,
  };
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${OUTPUT_FILE}`);
  printSummary(lightData, darkData, lightPageChrome, darkPageChrome, widthSnapshots);

} finally {
  await browser.close();
}

async function extractPageChrome(pg) {
  return pg.evaluate(() => {
    const cs = (sel, prop) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el)[prop] : null;
    };
    return {
      sidebarBg: cs('nav', 'backgroundColor'),
      conversationBg: cs('main', 'backgroundColor'),
      userBubbleBg:
        cs('[data-message-author-role="user"] > div > div', 'backgroundColor') ||
        cs('[data-message-author-role="user"]', 'backgroundColor'),
      inputBg: cs('#prompt-textarea', 'backgroundColor'),
      bodyBg: cs('body', 'backgroundColor'),
    };
  });
}

function printSummary(lightData, darkData, lightChrome, darkChrome, widthSnapshots = []) {
  console.log('\n=== Host Info ===');
  console.log('  userAgent:', darkData.userAgent);
  console.log('  platform:', darkData.platform);
  console.log('  displayMode:', darkData.displayMode);
  console.log('  availableDisplayModes:', JSON.stringify(darkData.availableDisplayModes));

  console.log('\n=== Host Capabilities ===');
  console.log(JSON.stringify(darkData.hostCapabilities, null, 2));

  console.log('\n=== Viewport / Container Dimensions ===');
  console.log(JSON.stringify(darkData.viewport, null, 2));

  console.log('\n=== Page Chrome (light | dark) ===');
  for (const key of Object.keys(lightChrome)) {
    console.log(`  ${key}: ${lightChrome[key]} | ${darkChrome[key]}`);
  }

  console.log('\n=== Window Dimensions ===');
  for (const [key, val] of Object.entries(darkData.windowDimensions || {})) {
    console.log(`  ${key}: ${val}`);
  }

  if (widthSnapshots.length > 0) {
    console.log('\n=== Responsive Width Behavior ===');
    console.log('  browserWidth → maxWidth (iframeWidth)');
    for (const s of widthSnapshots) {
      console.log(`  ${s.browserWidth}px → ${s.maxWidth}px (${s.iframeWidth}px)`);
    }
  }

  // New inspector fields
  if (darkData.iframeEnvironment) {
    console.log('\n=== Iframe Environment ===');
    for (const [key, val] of Object.entries(darkData.iframeEnvironment)) {
      console.log(`  ${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`);
    }
  }
  if (darkData.mediaQueries) {
    console.log('\n=== Media Queries ===');
    for (const [key, val] of Object.entries(darkData.mediaQueries)) {
      console.log(`  ${key}: ${val}`);
    }
  }
  if (darkData.featureDetection) {
    console.log('\n=== Feature Detection ===');
    for (const [key, val] of Object.entries(darkData.featureDetection)) {
      console.log(`  ${key}: ${val}`);
    }
  }
  if (darkData.scrollInfo) {
    console.log('\n=== Scroll Container ===');
    for (const [key, val] of Object.entries(darkData.scrollInfo)) {
      console.log(`  ${key}: ${val}`);
    }
  }
  if (darkData.performanceTiming) {
    console.log('\n=== Performance ===');
    for (const [key, val] of Object.entries(darkData.performanceTiming)) {
      console.log(`  ${key}: ${val}`);
    }
  }
}
