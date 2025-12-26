import type { Resource, Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP CallTool response data (subset used in simulations)
 */
export interface SimulationCallToolResult {
  structuredContent?: Record<string, unknown> | null;
  _meta?: Record<string, unknown>;
}

/**
 * Simulation configuration for MCP server.
 * Must include distPath for the built widget file.
 */
export interface SimulationWithDist {
  distPath: string;

  // MCP Tool protocol - official Tool type from MCP SDK used in ListTools response
  tool: Tool;

  // MCP Resource protocol - official Resource type from MCP SDK used in ListResources response
  // Loaded from resources/NAME-resource.json where NAME is the simulation key.
  resource: Resource;

  // MCP CallToolResult protocol - data for CallTool response
  toolCall?: SimulationCallToolResult;
}

/**
 * Configuration for the MCP server.
 * Takes an array of simulations with distPath for each built widget.
 */
export interface MCPServerConfig {
  name?: string;
  version?: string;
  port?: number;
  simulations: SimulationWithDist[];
}
