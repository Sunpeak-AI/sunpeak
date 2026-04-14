/**
 * Resolve the sunpeak CLI binary path.
 *
 * When sunpeak is installed as a local dependency (e.g., in tests/sunpeak/
 * for non-JS projects), the bare `sunpeak` command won't be on PATH.
 * This utility checks for the local .bin entry first, then falls back
 * to the bare command name for global installs.
 */
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Find the sunpeak binary, preferring the local node_modules/.bin entry.
 *
 * Checks in order:
 * 1. process.cwd() (works when running from the test directory directly)
 * 2. The directory containing this file's package (works when the config is
 *    loaded from a parent directory, e.g., `sunpeak test` run from project root
 *    with config at tests/sunpeak/playwright.config.ts)
 *
 * @returns {string} Path to the sunpeak binary, or bare 'sunpeak' as fallback
 */
export function resolveSunpeakBin() {
  // Check cwd first (covers `cd tests/sunpeak && sunpeak test`)
  const cwdBin = join(process.cwd(), 'node_modules', '.bin', 'sunpeak');
  if (existsSync(cwdBin)) return cwdBin;

  // Check the directory containing this module's package, which is the
  // sunpeak package root. Walk up from bin/lib/ to find node_modules/.bin/.
  // This covers running from a parent dir (e.g., project root) where sunpeak
  // is installed in a subdirectory (tests/sunpeak/node_modules/sunpeak/).
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkgRoot = join(__dirname, '..', '..');
  const pkgBin = join(pkgRoot, '..', '.bin', 'sunpeak');
  if (existsSync(pkgBin)) return pkgBin;

  return 'sunpeak';
}
