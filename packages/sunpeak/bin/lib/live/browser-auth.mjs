import { mkdtempSync, mkdirSync, cpSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir, homedir } from 'os';
import { rimrafSync, ANTI_BOT_ARGS, CHROME_USER_AGENT } from './utils.mjs';

/**
 * Browser profile paths on macOS.
 * Each entry maps a browser name to its user data directory.
 */
const BROWSER_PROFILES = {
  chrome: join(homedir(), 'Library/Application Support/Google/Chrome'),
  arc: join(homedir(), 'Library/Application Support/Arc/User Data'),
  brave: join(homedir(), 'Library/Application Support/BraveSoftware/Brave-Browser'),
  edge: join(homedir(), 'Library/Application Support/Microsoft Edge'),
};

/**
 * Subdirectories/files to copy from the browser profile.
 * These contain session cookies and local storage — enough for authenticated browsing.
 * Copying only these keeps the operation fast (<2s) vs copying the full profile (500MB+).
 */
const ESSENTIAL_PATHS = [
  'Default/Cookies',
  'Default/Cookies-journal',
  'Default/Local Storage',
  'Default/Session Storage',
  'Default/IndexedDB',
  'Default/Login Data',
  'Default/Login Data-journal',
  'Default/Preferences',
  'Default/Secure Preferences',
  'Default/Web Data',
  'Local State',
];

/**
 * Detect which browser the user has installed.
 * Returns the first available browser from the preference order.
 */
export function detectBrowser() {
  const order = ['chrome', 'arc', 'brave', 'edge'];
  for (const browser of order) {
    if (existsSync(BROWSER_PROFILES[browser])) {
      return browser;
    }
  }
  return null;
}

/**
 * Copy essential browser profile data to a temp directory.
 * Returns the temp directory path.
 */
function copyProfile(browser) {
  const profileDir = BROWSER_PROFILES[browser];
  if (!profileDir || !existsSync(profileDir)) {
    throw new Error(
      `Browser profile not found for "${browser}" at ${profileDir || '(unknown)'}.\n` +
      `Available browsers: ${Object.entries(BROWSER_PROFILES)
        .filter(([, p]) => existsSync(p))
        .map(([name]) => name)
        .join(', ') || 'none detected'}`
    );
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'sunpeak-live-'));

  for (const relativePath of ESSENTIAL_PATHS) {
    const src = join(profileDir, relativePath);
    if (!existsSync(src)) continue;

    const dest = join(tempDir, relativePath);
    try {
      cpSync(src, dest, { recursive: true });
    } catch {
      // Some files may be locked; skip silently
    }
  }

  // Ensure Default directory exists even if no essential files were copied.
  // Use an allowlist to avoid copying large cache/media directories.
  const defaultDir = join(tempDir, 'Default');
  if (!existsSync(defaultDir)) {
    mkdirSync(defaultDir, { recursive: true });
  }

  return tempDir;
}

/**
 * Launch a Playwright Chromium browser authenticated with the user's real browser session.
 *
 * Copies the user's browser profile to a temp directory, then launches Playwright
 * with that profile. The returned cleanup function removes the temp directory.
 *
 * @param {Object} options
 * @param {string} [options.browser='chrome'] - Browser to copy profile from
 * @param {boolean} [options.headless=false] - Run headless (usually false for live tests)
 * @returns {Promise<{ context: BrowserContext, page: Page, cleanup: () => void }>}
 */
export async function launchAuthenticatedBrowser({ browser = 'chrome', headless = false } = {}) {
  const { chromium } = await import('playwright');

  const tempDir = copyProfile(browser);

  const context = await chromium.launchPersistentContext(tempDir, {
    headless,
    args: ANTI_BOT_ARGS,
    viewport: { width: 1280, height: 900 },
    ignoreDefaultArgs: ['--enable-automation'],
    userAgent: CHROME_USER_AGENT,
  });

  const page = context.pages()[0] || await context.newPage();

  const cleanup = () => {
    try {
      rimrafSync(tempDir);
    } catch {
      // Best effort cleanup
    }
  };

  return { context, page, cleanup };
}
