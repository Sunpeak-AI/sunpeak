import type { Resource, Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Simulation configuration for MCP server.
 * Must include distPath for the built widget file.
 */
export interface SimulationWithDist {
  // Unique identifier derived from the simulation filename (e.g., 'albums-show')
  name: string;

  // Path to the built JS bundle (for production mode)
  distPath: string;

  // Path to the source TSX file (for Vite dev mode)
  srcPath?: string;

  // MCP Tool protocol - official Tool type from MCP SDK used in ListTools response
  tool: Tool;

  // MCP Resource protocol - official Resource type from MCP SDK used in ListResources response
  // Loaded from resources/NAME-resource.json where NAME is the simulation key.
  resource: Resource;

  // Official CallToolResult from the MCP SDK, data for CallTool response
  callToolResult?: CallToolResult;
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
  /**
   * Vite dev server instance for HMR mode.
   * When provided, resources are served as HTML that loads from Vite.
   * When not provided, resources serve bundled JS (production mode).
   */
  viteServer?: unknown; // ViteDevServer type, kept as unknown to avoid hard dependency
}
