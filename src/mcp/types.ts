import type { Resource, Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Supported MCP provider platforms.
 */
export enum MCPProvider {
  ChatGPT = "chatgpt",
}

/**
 * Configuration for the MCP server.
 */
export interface MCPServerConfig {
  name?: string;
  version?: string;
  port?: number;
  distPath: string;
  toolName?: string;
  toolDescription?: string;
  dummyData?: Record<string, unknown>;
  provider?: MCPProvider;
}

/**
 * Provider-specific metadata for widget descriptors.
 */
export interface WidgetDescriptorMeta {
  [key: string]: unknown;
}

/**
 * Provider-specific metadata for tool invocations.
 */
export interface WidgetInvocationMeta {
  [key: string]: unknown;
}

/**
 * Interface for platform-specific MCP provider implementations.
 */
export interface MCPProviderImplementation {
  /**
   * Get metadata for widget descriptors (tools and resources).
   */
  getWidgetDescriptorMeta(): WidgetDescriptorMeta;

  /**
   * Get metadata for tool invocation responses.
   */
  getWidgetInvocationMeta(): WidgetInvocationMeta;

  /**
   * Read and wrap the widget content for the platform.
   * @param distPath - Path to the built widget JS file.
   * @returns The wrapped HTML content ready for the platform.
   */
  readWidgetContent(distPath: string): string;

  /**
   * Get the MIME type for widget resources.
   */
  getWidgetMimeType(): string;

  /**
   * Get the resource URI for the widget.
   */
  getWidgetResourceUri(): string;

  /**
   * Create the tool definition for the provider.
   */
  createTool(config: {
    name: string;
    description: string;
    inputSchema: Tool["inputSchema"];
  }): Tool;

  /**
   * Create the resource definition for the provider.
   */
  createResource(config: { name: string; description: string }): Resource;
}
