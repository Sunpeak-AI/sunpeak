/**
 * Host-agnostic Playwright config factory for live tests.
 *
 * Generates one Playwright project per host. Tests switch color scheme,
 * viewport, and other host state internally via live.setColorScheme() and
 * live.page so each resource is only invoked once per host.
 *
 * Usage in playwright.config.ts:
 *   import { defineLiveConfig } from 'sunpeak/test/config';
 *   export default defineLiveConfig();                                    // ChatGPT
 *   export default defineLiveConfig({ hosts: ['chatgpt', 'claude'] });   // Both hosts
 */
import { createLiveConfig } from './live-config.mjs';

/** Default hosts to test against. */
const DEFAULT_HOSTS = ['chatgpt'];

/**
 * Create a complete Playwright config with one project per host.
 *
 * @param {Object} [options]
 * @param {string[]} [options.hosts=['chatgpt']] - Hosts to test against
 * @param {import('./live-config.d.mts').LiveConfigOptions} [options] - All other options passed to createLiveConfig
 */
export function defineLiveConfig(options = {}) {
  const { hosts = DEFAULT_HOSTS, ...configOptions } = options;

  // Use the first host for the base config (shared settings like webServer, globalSetup)
  const baseConfig = createLiveConfig({ hostId: hosts[0] }, configOptions);

  return {
    ...baseConfig,
    projects: hosts.map((host) => ({ name: host })),
  };
}
