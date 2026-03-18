/**
 * Playwright config for live ChatGPT tests.
 *
 * Usage in playwright.config.ts:
 *   import { defineLiveConfig } from 'sunpeak/test/chatgpt/config';
 *   export default defineLiveConfig();
 */
import { createLiveConfig } from './live-config.mjs';

export function defineLiveConfig(options = {}) {
  return createLiveConfig({ hostId: 'chatgpt' }, options);
}
