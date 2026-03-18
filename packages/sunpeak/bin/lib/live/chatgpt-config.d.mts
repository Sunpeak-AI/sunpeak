import type { PlaywrightTestConfig } from '@playwright/test';
import type { LiveConfigOptions } from './live-config.d.mts';

/** Create a complete Playwright config for live ChatGPT testing. */
export declare function defineLiveConfig(options?: LiveConfigOptions): PlaywrightTestConfig;
