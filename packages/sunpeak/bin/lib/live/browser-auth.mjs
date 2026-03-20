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
 * Get the Chrome profile subdirectory name to copy from.
 * Defaults to "Default" but can be overridden via SUNPEAK_CHROME_PROFILE env var
 * (e.g., "Profile 5" for a non-default Chrome profile).
 */
function getProfileSubdir() {
  return process.env.SUNPEAK_CHROME_PROFILE || 'Default';
}

/**
 * Subdirectories/files to copy from the browser profile.
 * These contain session cookies and local storage — enough for authenticated browsing.
 * Copying only these keeps the operation fast (<2s) vs copying the full profile (500MB+).
 *
 * The profile subdirectory (Default, Profile 1, Profile 5, etc.) is determined by
 * getProfileSubdir(). Set SUNPEAK_CHROME_PROFILE env var to use a non-default profile.
 */
function getEssentialPaths() {
  const profile = getProfileSubdir();
  return [
    `${profile}/Cookies`,
    `${profile}/Cookies-journal`,
    `${profile}/Local Storage`,
    `${profile}/Session Storage`,
    `${profile}/IndexedDB`,
    `${profile}/Login Data`,
    `${profile}/Login Data-journal`,
    `${profile}/Preferences`,
    `${profile}/Secure Preferences`,
    `${profile}/Web Data`,
    'Local State',
  ];
}

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

  const profileSubdir = getProfileSubdir();
  const essentialPaths = getEssentialPaths();
  const tempDir = mkdtempSync(join(tmpdir(), 'sunpeak-live-'));

  for (const relativePath of essentialPaths) {
    const src = join(profileDir, relativePath);
    if (!existsSync(src)) continue;

    // Remap the source profile subdir to "Default" in the temp dir.
    // Playwright's launchPersistentContext always uses "Default" as the profile name.
    const destRelative = relativePath.startsWith(profileSubdir + '/')
      ? 'Default' + relativePath.slice(profileSubdir.length)
      : relativePath;
    const dest = join(tempDir, destRelative);
    try {
      cpSync(src, dest, { recursive: true });
    } catch {
      // Some files may be locked; skip silently
    }
  }

  // Ensure Default directory exists even if no essential files were copied.
  const defaultDir = join(tempDir, 'Default');
  if (!existsSync(defaultDir)) {
    mkdirSync(defaultDir, { recursive: true });
  }

  if (profileSubdir !== 'Default') {
    console.log(`Using Chrome profile: ${profileSubdir}`);
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
  // Resolve chromium from @playwright/test (which re-exports it) rather than
  // the standalone 'playwright' package — pnpm doesn't hoist transitive deps
  // so 'playwright' isn't directly resolvable from user projects.
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    // Fallback: resolve via @playwright/test which is always a direct dependency
    const projectRoot = process.env.SUNPEAK_PROJECT_ROOT || process.cwd();
    const { resolvePlaywright } = await import('./utils.mjs');
    ({ chromium } = resolvePlaywright(projectRoot));
  }

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
