/**
 * Core simulation types for development and testing.
 * These types define how simulations are configured and used in both
 * the dev inspector and MCP server contexts.
 */

import type { Tool, Resource, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { McpUiHostContext } from '@modelcontextprotocol/ext-apps';

/**
 * Mock response for a server tool call within a simulation.
 *
 * Simple form: a single `CallToolResult` always returned.
 * Conditional form: an array of `{ when, result }` entries — the first
 * entry whose `when` keys shallow-match the call arguments wins.
 */
export type ServerToolMock =
  | CallToolResult
  | Array<{ when: Record<string, unknown>; result: CallToolResult }>;

/**
 * A simulation packages a component with its example data and metadata.
 * Each simulation represents a complete tool experience in the inspector.
 *
 * Resource rendering options (mutually exclusive):
 * - `resourceUrl`: URL to an HTML page (dev mode with Vite HMR)
 * - `resourceScript`: URL to a built resource file (production builds)
 */
export interface Simulation {
  // Unique identifier derived from the simulation filename (e.g., 'show-albums')
  name: string;

  // URL to an HTML page to load in an iframe (dev mode).
  // The page mounts the resource component and uses SDK's useApp().
  resourceUrl?: string;

  // URL to a built resource for iframe rendering (production builds).
  resourceScript?: string;

  userMessage?: string; // Decoration for the inspector, no functional purpose.

  // Official Tool type from the MCP SDK, used in ListTools response.
  tool: Tool;

  // Official Resource type from the MCP SDK, used in ListResources response.
  // Undefined for tools without a UI.
  resource?: Resource;

  // Tool input arguments (the arguments object sent to CallTool).
  toolInput?: Record<string, unknown>;

  // Tool result data (the response from CallTool).
  toolResult?: {
    content?: Array<{ type: string; text: string }>;
    structuredContent?: unknown;
    isError?: boolean;
  };

  // Initial host context overrides for the simulation.
  hostContext?: Partial<McpUiHostContext>;

  /**
   * Mock responses for `callServerTool` calls made by the resource.
   * Keys are tool names; values are either a single result or an array
   * of conditional `{ when, result }` entries for argument-based matching.
   */
  serverTools?: Record<string, ServerToolMock>;
}

/**
 * Resolve a `ServerToolMock` to a concrete `CallToolResult` given the call arguments.
 *
 * - Simple form (single result): returns it directly.
 * - Conditional form (array of `{ when, result }`): returns the first entry
 *   whose `when` keys all shallow-equal the corresponding values in `args`.
 *   Falls back to `undefined` if no condition matches.
 */
export function resolveServerToolResult(
  mock: ServerToolMock,
  args: Record<string, unknown> | undefined
): CallToolResult | undefined {
  if (!Array.isArray(mock)) return mock;

  for (const entry of mock) {
    const matches = Object.entries(entry.when).every(
      ([key, value]) => args != null && args[key] === value
    );
    if (matches) return entry.result;
  }
  return undefined;
}
