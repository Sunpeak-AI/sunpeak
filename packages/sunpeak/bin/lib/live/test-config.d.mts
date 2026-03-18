import type { PlaywrightTestConfig } from '@playwright/test';
import type { LiveConfigOptions } from './live-config.d.mts';

export interface TestConfigOptions extends LiveConfigOptions {
  /** Hosts to test against. Default: ['chatgpt'] */
  hosts?: string[];
}

/** Create a complete Playwright config with one project per host. */
export declare function defineLiveConfig(options?: TestConfigOptions): PlaywrightTestConfig;
