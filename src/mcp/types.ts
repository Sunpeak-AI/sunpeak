import type { Resource, Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Supported MCP provider platforms.
 */
export enum MCPProvider {
  ChatGPT = "chatgpt",
}

/**
 * Tool configuration for MCP server.
 */
export interface MCPTool {
  name: string;
  description: string;
  distPath: string;
  structuredContent?: Record<string, unknown> | null;
  listMetadata?: Record<string, unknown> | null;
  callMetadata?: Record<string, unknown> | null;
  resourceUri: string;
}

/**
 * Configuration for the MCP server.
 */
export interface MCPServerConfig {
  name?: string;
  version?: string;
  port?: number;
  distPath?: string;
  tools: MCPTool[];
  provider?: MCPProvider;
}

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
