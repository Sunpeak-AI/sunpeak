/**
 * Runtime types for MCP Apps environments.
 * Re-exports canonical types from the MCP Apps SDK and provides
 * legacy type aliases for backwards compatibility.
 */

// Re-export canonical MCP Apps types
export type {
  McpUiHostContext,
  McpUiTheme,
  McpUiDisplayMode,
  McpUiAppCapabilities,
  McpUiHostCapabilities,
  McpUiHostStyles,
  McpUiStyleVariableKey,
  McpUiStyles,
} from '@modelcontextprotocol/ext-apps';

// Type aliases for backwards compatibility and ergonomics
export type {
  McpUiTheme as Theme,
  McpUiDisplayMode as DisplayMode,
} from '@modelcontextprotocol/ext-apps';

export type SafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

// Legacy types kept for simulator-url.ts
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';
export type ViewMode = 'modal' | 'default';
