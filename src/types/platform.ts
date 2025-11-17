/**
 * Platform-agnostic types for genAI App SDKs
 *
 * These types define a common interface that can be implemented
 * by different platforms (ChatGPT, Gemini, Claude, etc.)
 */

export type UnknownObject = Record<string, unknown>;

export type Theme = 'light' | 'dark';

export type SafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type SafeArea = {
  insets: SafeAreaInsets;
};

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export type UserAgent = {
  device: { type: DeviceType };
  capabilities: {
    hover: boolean;
    touch: boolean;
  };
};

/** Display mode for the app */
export type DisplayMode = 'pip' | 'inline' | 'fullscreen';

export type RequestDisplayMode = (args: { mode: DisplayMode }) => Promise<{
  mode: DisplayMode;
}>;

export type CallToolResponse = {
  result: string;
};

export type CallTool = (
  name: string,
  args: Record<string, unknown>
) => Promise<CallToolResponse>;

/**
 * Platform-agnostic global state interface
 *
 * All genAI platforms should implement this interface to work with Sunpeak components.
 */
export type PlatformGlobals<
  ToolInput = UnknownObject,
  ToolOutput = UnknownObject,
  ToolResponseMetadata = UnknownObject,
  WidgetState = UnknownObject
> = {
  // Visuals
  colorScheme: Theme;
  userAgent: UserAgent;
  locale: string;

  // Layout
  maxHeight: number;
  displayMode: DisplayMode;
  safeArea: SafeArea;

  // State
  toolInput: ToolInput;
  toolOutput: ToolOutput | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  widgetState: WidgetState | null;
  setWidgetState: (state: WidgetState) => Promise<void>;
};

/**
 * Platform API methods
 */
export type PlatformAPI = {
  callTool: CallTool;
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
  openExternal(payload: { href: string }): void;
  requestDisplayMode: RequestDisplayMode;
};

/**
 * Platform adapter interface
 *
 * Implement this interface to add support for a new genAI platform.
 */
export interface PlatformAdapter {
  /**
   * Platform identifier (e.g., 'chatgpt', 'gemini', 'claude')
   */
  readonly name: string;

  /**
   * Check if this platform is available in the current environment
   */
  isAvailable(): boolean;

  /**
   * Get a specific global value
   */
  getGlobal<K extends keyof PlatformGlobals>(key: K): PlatformGlobals[K] | null;

  /**
   * Get all platform globals
   */
  getGlobals(): (PlatformAPI & PlatformGlobals) | null;

  /**
   * Subscribe to changes in platform globals
   * Returns an unsubscribe function
   */
  subscribe(callback: () => void): () => void;
}

/**
 * Platform registry to track supported platforms
 */
export type PlatformType = 'chatgpt' | 'gemini' | 'claude' | 'custom';
