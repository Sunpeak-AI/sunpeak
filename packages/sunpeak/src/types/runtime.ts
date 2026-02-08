/**
 * Runtime types for MCP Apps environments.
 * Re-exports canonical types from the MCP Apps SDK with short aliases.
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

// Short aliases for common SDK types
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

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
