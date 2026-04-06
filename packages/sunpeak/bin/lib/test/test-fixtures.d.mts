import type {
  Page,
  FrameLocator,
  Locator,
  TestType,
  Expect,
  PageAssertionsToHaveScreenshotOptions,
} from '@playwright/test';

/**
 * Result from calling an MCP tool via the inspector.
 */
export interface ToolResult {
  /** Raw MCP content items from the tool response. */
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  /** Structured content from the tool response. */
  structuredContent?: unknown;
  /** Whether the tool returned an error. */
  isError: boolean;
  /**
   * Get a FrameLocator for the rendered resource UI.
   * Handles the double-iframe traversal automatically.
   */
  app(): FrameLocator;
}

/**
 * Options for callTool().
 */
export interface CallToolOptions {
  /** Color theme for the inspector. */
  theme?: 'light' | 'dark';
  /** Display mode for the resource. */
  displayMode?: 'inline' | 'pip' | 'fullscreen';
  /** Use production resource builds instead of HMR. */
  prodResources?: boolean;
  /** Additional inspector URL parameters. */
  [key: string]: unknown;
}

/**
 * Options for screenshot().
 *
 * Extends Playwright's toHaveScreenshot() options with sunpeak-specific
 * `target` and `element` fields. All standard Playwright options (threshold,
 * maxDiffPixelRatio, maxDiffPixels, mask, maskColor, animations, caret,
 * fullPage, clip, scale, stylePath, omitBackground, timeout, etc.)
 * are passed through directly.
 */
export interface ScreenshotOptions extends PageAssertionsToHaveScreenshotOptions {
  /** What to screenshot: 'app' (inner iframe content) or 'page' (full inspector). Default: 'app'. */
  target?: 'app' | 'page';
  /** Specific locator to screenshot instead of the default target. */
  element?: Locator;
}

/**
 * MCP test fixture for testing MCP servers via the inspector.
 */
export interface McpFixture {
  /** The underlying Playwright Page. */
  page: Page;
  /** Current host ID (from Playwright project name). */
  host: string;

  /**
   * Call a tool and get the rendered result.
   * Navigates the inspector, waits for the resource to render,
   * and returns a ToolResult for assertions.
   */
  callTool(
    name: string,
    input?: Record<string, unknown>,
    options?: CallToolOptions
  ): Promise<ToolResult>;

  /**
   * Navigate to a tool with no mock data ("Press Run" state).
   */
  openTool(name: string, options?: { theme?: 'light' | 'dark' }): Promise<void>;

  /**
   * Click the Run button and return the rendered result.
   */
  runTool(): Promise<ToolResult>;

  /** Change the theme via the sidebar toggle. */
  setTheme(theme: 'light' | 'dark'): Promise<void>;

  /** Change the display mode via the sidebar buttons. */
  setDisplayMode(mode: 'inline' | 'pip' | 'fullscreen'): Promise<void>;

  /**
   * Take a screenshot and compare against a baseline.
   * Only performs the comparison when visual testing is enabled
   * (`sunpeak test --visual`). Silently skips otherwise.
   *
   * @param name - Snapshot name (auto-generated from test title if omitted)
   * @param options - Screenshot and comparison options
   */
  screenshot(name?: string, options?: ScreenshotOptions): Promise<void>;
}

/**
 * Extended Playwright test with `mcp` fixture.
 */
export declare const test: TestType<{ mcp: McpFixture }, {}>;

/**
 * Extended Playwright expect with MCP-native matchers.
 */
export declare const expect: Expect<{
  /**
   * Assert that a tool result is an error.
   */
  toBeError(): void;
  /**
   * Assert that any content item's text contains the given string.
   */
  toHaveTextContent(text: string): void;
  /**
   * Assert that structuredContent matches the expected shape.
   */
  toHaveStructuredContent(shape: unknown): void;
  /**
   * Assert that content array contains an item of the given type.
   */
  toHaveContentType(type: string): void;
}>;
