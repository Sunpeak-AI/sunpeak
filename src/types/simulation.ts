/**
 * Core simulation types for development and testing.
 * These types define how simulations are configured and used in both
 * the dev simulator and MCP server contexts.
 */

import type * as React from 'react';
import type {
  Tool,
  Resource,
  CallToolRequestParams,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * A simulation packages a component with its example data and metadata.
 * Each simulation represents a complete tool experience in the simulator.
 *
 * Specify either `resourceComponent` (React component) or `resourceScript` (URL to built .js file).
 */
export interface Simulation {
  // Unique identifier derived from the simulation filename (e.g., 'albums-show')
  name: string;

  // Core simulation fields - provide one of these:
  // React component for direct rendering
  resourceComponent?: React.ComponentType;
  // URL to a built .js file for iframe rendering (e.g., '/dist/carousel.js')
  resourceScript?: string;

  userMessage?: string; // Decoration for the simulator, no functional purpose.

  // Official Tool type from the MCP SDK, used in ListTools response.
  tool: Tool;

  // Official Resource type from the MCP SDK, used in ListResources response.
  resource: Resource;

  // Official CallToolResult from the MCP SDK, mock data for the CallTool response.
  callToolResult?: CallToolResult;

  // Official CallToolRequestParams from the MCP SDK (arguments maps to toolInput in the runtime).
  callToolRequestParams?: CallToolRequestParams;

  // Initial widget state for the simulation.
  widgetState?: Record<string, unknown> | null;
}
