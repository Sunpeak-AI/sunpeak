import { readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

/**
 * Recursively remove a directory (rm -rf equivalent).
 */
export function rimrafSync(dir) {
  rmSync(dir, { recursive: true, force: true });
}

/**
 * Browser launch args that bypass Cloudflare/ChatGPT bot detection.
 * Used in browser-auth, global-setup, and live-config.
 */
export const ANTI_BOT_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--no-first-run',
  '--no-default-browser-check',
];

/**
 * Real Chrome user agent string to avoid Cloudflare challenges.
 * Update periodically to match the Playwright-bundled Chromium version.
 */
export const CHROME_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Resolve @playwright/test from the user's project via CJS require.
 * Use for non-test code (global-setup, config) where duplicate instances don't matter.
 */
export function resolvePlaywright(projectRoot) {
  const require = createRequire(join(projectRoot, 'package.json'));
  return require('@playwright/test');
}

/**
 * Resolve @playwright/test ESM module from the user's project.
 * Use for test fixtures that call test.extend() — avoids CJS/ESM duplicate module issues.
 * Cached: safe to call multiple times.
 */
let _cachedPlaywright = null;
let _cachedProjectRoot = null;
export async function resolvePlaywrightESM(projectRoot) {
  if (_cachedPlaywright && _cachedProjectRoot === projectRoot) return _cachedPlaywright;
  const require = createRequire(join(projectRoot, 'package.json'));
  const playwrightPath = require.resolve('@playwright/test');
  const mod = await import(playwrightPath);
  // Dynamic import() of @playwright/test (CJS) puts the test function at mod.default.
  // The test function doubles as the module namespace — test.extend, test.expect, etc.
  // Normalize so callers can destructure { test, expect } directly.
  const pw = mod.default || mod;
  _cachedPlaywright = { test: pw, expect: pw.expect };
  _cachedProjectRoot = projectRoot;
  return _cachedPlaywright;
}

/**
 * Read the app name from the project's package.json.
 * Cached: safe to call multiple times.
 */
let _cachedAppName = null;
let _cachedAppNameRoot = null;
export function getAppName(projectRoot) {
  if (_cachedAppName && _cachedAppNameRoot === projectRoot) return _cachedAppName;
  _cachedAppName = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8')).name;
  _cachedAppNameRoot = projectRoot;
  return _cachedAppName;
}
