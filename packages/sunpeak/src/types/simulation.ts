/**
 * Core simulation types for development and testing.
 * These types define how simulations are configured and used in both
 * the dev simulator and MCP server contexts.
 */

import type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';
import type { McpUiHostContext } from '@modelcontextprotocol/ext-apps';

/**
 * A simulation packages a component with its example data and metadata.
 * Each simulation represents a complete tool experience in the simulator.
 *
 * Resource rendering options (mutually exclusive):
 * - `resourceUrl`: URL to an HTML page (dev mode with Vite HMR)
 * - `resourceScript`: URL to a built .js file (production builds)
 */
export interface Simulation {
  // Unique identifier derived from the simulation filename (e.g., 'albums-show')
  name: string;

  // URL to an HTML page to load in an iframe (dev mode).
  // The page mounts the resource component and uses SDK's useApp().
  resourceUrl?: string;

  // URL to a built .js file for iframe rendering (e.g., '/dist/carousel.js').
  // Used by https://app.sunpeak.ai for production builds.
  resourceScript?: string;

  userMessage?: string; // Decoration for the simulator, no functional purpose.

  // Official Tool type from the MCP SDK, used in ListTools response.
  tool: Tool;

  // Official Resource type from the MCP SDK, used in ListResources response.
  resource: Resource;

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
}
