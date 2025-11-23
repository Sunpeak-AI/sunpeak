/**
 * Provider-agnostic types for widget runtime environments.
 * These types abstract away the specific host (OpenAI/ChatGPT, etc.)
 */

// Re-export shared types from the main types module
// These are the canonical definitions used across the codebase
export type {
  UnknownObject,
  Theme,
  SafeAreaInsets,
  SafeArea,
  DeviceType,
  UserAgent,
  DisplayMode,
  ViewMode,
  View,
  CallToolResponse,
} from '../chatgpt/openai-types';

// Import for use in this module
import type {
  UnknownObject,
  Theme,
  UserAgent,
  DisplayMode,
  SafeArea,
  View,
  ViewMode,
  CallToolResponse,
} from '../chatgpt/openai-types';

/**
 * Global state available from the widget runtime environment.
 * This is a provider-agnostic alias for OpenAiGlobals.
 */
export type WidgetGlobals<
  ToolInput = UnknownObject,
  ToolOutput = UnknownObject,
  ToolResponseMetadata = UnknownObject,
  WidgetState = UnknownObject
> = {
  theme: Theme;
  userAgent: UserAgent;
  locale: string;
  maxHeight: number;
  displayMode: DisplayMode;
  safeArea: SafeArea;
  view: View | null;
  toolInput: ToolInput;
  toolOutput: ToolOutput | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  widgetState: WidgetState | null;
  // Note: setWidgetState is included here for OpenAI compatibility
  // but is also available via the API
  setWidgetState: (state: WidgetState) => Promise<void>;
};

/**
 * API methods available from the widget runtime environment.
 * This is a provider-agnostic alias for OpenAiAPI.
 */
export type WidgetAPI = {
  callTool?: (name: string, args: Record<string, unknown>) => Promise<CallToolResponse>;
  sendFollowUpMessage?: (args: { prompt: string }) => Promise<void>;
  openExternal?: (payload: { href: string }) => void;
  requestDisplayMode?: (args: { mode: DisplayMode }) => Promise<{ mode: DisplayMode }>;
  requestModal?: (args: { mode: ViewMode; params?: UnknownObject }) => Promise<void>;
  notifyIntrinsicHeight?: (height: number) => void;
  setWidgetState?: (state: UnknownObject) => Promise<void>;
};

/**
 * Provider interface that abstracts the widget runtime environment.
 * Each host (OpenAI, etc.) implements this interface.
 */
export interface WidgetProvider {
  /**
   * Unique identifier for the provider.
   */
  readonly id: string;

  /**
   * Get the current value of a global property.
   */
  getGlobal<K extends keyof WidgetGlobals>(key: K): WidgetGlobals[K] | null;

  /**
   * Subscribe to changes for a specific global property.
   * Returns an unsubscribe function.
   */
  subscribe(key: keyof WidgetGlobals, onChange: () => void): () => void;

  /**
   * Get the API methods, or null if not available.
   */
  getAPI(): WidgetAPI | null;
}
