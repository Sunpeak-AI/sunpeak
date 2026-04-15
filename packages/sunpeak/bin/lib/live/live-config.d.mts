import type { PlaywrightTestConfig } from '@playwright/test';

export interface LiveConfigOptions {
  /** Test directory relative to playwright.config.ts. Default: '.' */
  testDir?: string;
  /** Directory for auth state. Default: '{testDir}/.auth' */
  authDir?: string;
  /** Port for the Vite dev server. MCP server always uses 8000. Default: 3456 */
  vitePort?: number;

  // --- Browser environment ---

  /** Emulate light or dark mode (sets prefers-color-scheme). The host follows this for theming. */
  colorScheme?: 'light' | 'dark';
  /** Browser viewport size. Default: Playwright's default (1280x720). */
  viewport?: { width: number; height: number };
  /** Browser locale (e.g., 'en-US', 'fr-FR'). */
  locale?: string;
  /** IANA timezone ID (e.g., 'America/New_York', 'Europe/London'). */
  timezoneId?: string;
  /** Emulate geolocation coordinates. */
  geolocation?: { latitude: number; longitude: number };
  /** Browser permissions to grant (e.g., ['geolocation']). */
  permissions?: string[];

  /** Show the dev overlay (resource timestamp + tool timing) in resources. Default: true */
  devOverlay?: boolean;

  /** Additional Playwright `use` options, merged with defaults. */
  use?: Record<string, unknown>;

  /** External MCP server config. Omit for sunpeak framework projects. */
  server?: {
    /** Server URL (e.g., 'http://localhost:8000/mcp') */
    url?: string;
    /** Server start command */
    command?: string;
    /** Command arguments */
    args?: string[];
  };
}

export interface HostConfigOptions {
  hostId: string;
  authFileName?: string;
}

export declare function createLiveConfig(
  hostOptions: HostConfigOptions,
  options?: LiveConfigOptions,
): PlaywrightTestConfig;
