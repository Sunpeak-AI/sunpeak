import type { Resource, Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Supported MCP provider platforms.
 */
export enum MCPProvider {
  ChatGPT = "chatgpt",
}

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
  resource: Resource;

  // MCP CallTool protocol - data for CallTool response
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
  provider?: MCPProvider;
}

/**
 * @deprecated Use SimulationWithDist instead
 */
export type MCPTool = SimulationWithDist;

/**
 * Provider-specific metadata for MCP tools.
 * Maps to the _meta attribute in MCP protocol.
 */
export interface ToolMeta {
  [key: string]: unknown;
}

/**
 * Interface for platform-specific MCP provider implementations.
 */
export interface MCPProviderImplementation {
  /**
   * Get default metadata for MCP tools.
   * Maps to the _meta attribute in MCP protocol.
   */
  getDefaultToolMeta(): ToolMeta;

  /**
   * Read and wrap the tool content for the platform.
   * @param distPath - Path to the built tool JS file.
   * @returns The wrapped HTML content ready for the platform.
   */
  readToolContent(distPath: string): string;

  /**
   * Get the MIME type for tool resources.
   */
  getToolMimeType(): string;

  /**
   * Create the tool definition for the provider.
   */
  createTool(config: {
    name: string;
    description: string;
    inputSchema: Tool["inputSchema"];
    metadata?: Record<string, unknown> | null;
  }): Tool;

  /**
   * Create the resource definition for the provider.
   */
  createResource(config: {
    name: string;
    description: string;
    uri: string;
    metadata?: Record<string, unknown> | null;
  }): Resource;
}
