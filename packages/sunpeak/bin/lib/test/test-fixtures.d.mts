import type {
  Page,
  FrameLocator,
  Locator,
  TestType,
  Expect,
  PageAssertionsToHaveScreenshotOptions,
} from '@playwright/test';

// ── MCP Protocol Types ──

export interface Tool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  title?: string;
  annotations?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
}

export interface Resource {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
  _meta?: Record<string, unknown>;
}

export interface CallToolResult {
  content?: Array<{ type: string; text?: string; [key: string]: unknown }>;
  structuredContent?: unknown;
  isError?: boolean;
}

// ── sunpeak Inspector Types ──

export interface RenderToolOptions {
  theme?: 'light' | 'dark';
  displayMode?: 'inline' | 'pip' | 'fullscreen';
  timeout?: number;
  [key: string]: unknown;
}

export interface ScreenshotOptions extends PageAssertionsToHaveScreenshotOptions {
  /** What to screenshot: 'app' (inner iframe content) or 'page' (full inspector). Default: 'app'. */
  target?: 'app' | 'page';
  /** Specific locator to screenshot instead of the default target. */
  element?: Locator;
}

export interface InspectorResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  structuredContent?: unknown;
  isError: boolean;
  source: 'fixture' | 'server';
  app(): FrameLocator;
  screenshot(options?: ScreenshotOptions): Promise<void>;
  screenshot(name?: string, options?: ScreenshotOptions): Promise<void>;
}

// ── Fixtures ──

/** MCP protocol fixture. Maps 1:1 to MCP protocol operations. */
export interface McpFixture {
  listTools(): Promise<Tool[]>;
  callTool(name: string, input?: Record<string, unknown>): Promise<CallToolResult>;
  listResources(): Promise<Resource[]>;
  readResource(uri: string): Promise<string>;
}

/** sunpeak inspector fixture. Renders tools in simulated host environments. */
export interface InspectorFixture {
  host: string;
  page: Page;
  renderTool(
    name: string,
    input?: Record<string, unknown>,
    options?: RenderToolOptions
  ): Promise<InspectorResult>;
}

export declare const test: TestType<{ mcp: McpFixture; inspector: InspectorFixture }, {}>;

export declare const expect: Expect<{
  toBeError(): void;
  toHaveTextContent(text: string): void;
  toHaveStructuredContent(shape: unknown): void;
  toHaveContentType(type: string): void;
}>;
