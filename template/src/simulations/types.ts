/**
 * Type definitions for tool configurations and simulations.
 */

import type {
  Theme,
  UserAgent,
  DisplayMode,
  SafeArea,
  View,
  UnknownObject,
} from 'sunpeak';

/**
 * Server-safe tool configuration.
 * Contains metadata for both MCP server and simulation purposes.
 */
export interface ToolConfig {
  // Tool identifier (used for both simulation selection and MCP tool name)
  value: string;

  // Simulation metadata
  label: string;
  userMessage: string;

  // Simulator initial global state (optional - prefixed with sim)
  simTheme?: Theme;
  simUserAgent?: UserAgent;
  simLocale?: string;
  simMaxHeight?: number;
  simDisplayMode?: DisplayMode;
  simSafeArea?: SafeArea;
  simView?: View | null;
  simToolInput?: UnknownObject;
  simWidgetState?: UnknownObject | null;

  // MCP fields, respond to the MCP client with these (optional - prefixed with mcp)
  mcpToolOutput?: UnknownObject | null;
  mcpToolCallMetadata?: UnknownObject | null;
  mcpToolListMetadata?: UnknownObject | null;
  mcpResourceURI: string;

  // MCP server metadata
  toolDescription: string;
}
