import type { PlaywrightTestConfig } from '@playwright/test';

/**
 * MCP server connection configuration.
 */
export interface ServerConfig {
  /** Server start command (e.g., 'python'). */
  command?: string;
  /** Command arguments (e.g., ['server.py']). */
  args?: string[];
  /** HTTP server URL (alternative to command/args). */
  url?: string;
  /** Environment variables for the server process. */
  env?: Record<string, string>;
}

/**
 * Visual regression testing configuration.
 *
 * All fields except `snapshotPathTemplate` are forwarded to Playwright's
 * `expect.toHaveScreenshot` config. See Playwright docs for the full set
 * of options (threshold, maxDiffPixelRatio, maxDiffPixels, animations, etc.).
 */
export interface VisualConfig {
  /** Snapshot directory path template. Default: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}'. */
  snapshotPathTemplate?: string;
  /** Pixel comparison threshold (0-1). */
  threshold?: number;
  /** Maximum allowed ratio of differing pixels (0-1). */
  maxDiffPixelRatio?: number;
  /** Absolute count of allowed different pixels. */
  maxDiffPixels?: number;
  /** Any other Playwright toHaveScreenshot options applied as project-wide defaults. */
  [key: string]: unknown;
}

/**
 * Configuration options for sunpeak test config.
 */
export interface TestConfigOptions {
  /**
   * MCP server connection. Omit for sunpeak framework projects (auto-detected).
   * Required for external MCP servers.
   */
  server?: ServerConfig;
  /** Host shells to test against (default: ['chatgpt', 'claude']). */
  hosts?: string[];
  /** Test directory (default: 'tests/e2e' for sunpeak, '.' for external). */
  testDir?: string;
  /** Simulations directory for mock data. */
  simulationsDir?: string;
  /** Global setup file path. */
  globalSetup?: string;
  /** Additional Playwright `use` options. */
  use?: Record<string, unknown>;
  /** Visual regression testing configuration. */
  visual?: VisualConfig;
}

/**
 * Create a Playwright config for testing MCP servers.
 *
 * Auto-detects sunpeak projects and starts `sunpeak dev` as the backend.
 * For external servers, starts `sunpeak inspect` with the provided server config.
 */
export declare function defineConfig(options?: TestConfigOptions): PlaywrightTestConfig;
