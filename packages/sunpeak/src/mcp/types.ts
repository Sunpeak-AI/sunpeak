import type {
  Resource,
  Tool,
  ServerRequest,
  ServerNotification,
} from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ToolConfig } from '@modelcontextprotocol/ext-apps/server';

export type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
export type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

/**
 * Extra context passed to tool handlers as the second argument.
 *
 * This is a pre-applied alias for the MCP SDK's `RequestHandlerExtra` —
 * no custom fields, just ergonomic generics so users don't need to parameterize it.
 *
 * Key fields: `authInfo`, `sessionId`, `signal`, `_meta`.
 */
export type ToolHandlerExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

/**
 * Configuration for a Sunpeak tool file's `tool` export.
 *
 * Extends the ext-apps `ToolConfig` with a `resource` field that links
 * the tool to a resource by its unique name string.
 */
export interface AppToolConfig extends ToolConfig {
  /** The resource name (must match a directory in `src/resources/`, e.g. `'albums'`). */
  resource: string;
}

/**
 * Simulation configuration for MCP server.
 * Must include distPath for the built HTML file.
 */
export interface SimulationWithDist {
  // Unique identifier derived from the simulation filename (e.g., 'show-albums')
  name: string;

  // Path to the built HTML file (for production mode)
  distPath: string;

  // Path to the source TSX file (for Vite dev mode)
  srcPath?: string;

  // MCP Tool protocol - official Tool type from MCP SDK used in ListTools response
  tool: Tool;

  // MCP Resource protocol - official Resource type from MCP SDK used in ListResources response
  // MCP Resource metadata (name, uri, description, _meta).
  resource: Resource;

  // Tool result data for CallTool response
  toolResult?: {
    content?: Array<{ type: string; text: string }>;
    structuredContent?: unknown;
    isError?: boolean;
  };
}

/**
 * Handle returned by `runMCPServer` for controlling the running server.
 */
export interface MCPServerHandle {
  /**
   * Notify non-local sessions that resources have changed.
   * Sends `notifications/resources/list_changed` so hosts re-fetch fresh content.
   * Local sessions (ChatGPT, simulator) are skipped since they use Vite HMR.
   */
  invalidateResources(): void;
}

/**
 * Configuration for the MCP server.
 * Takes an array of simulations with distPath for each built HTML file.
 */
export interface MCPServerConfig {
  name?: string;
  version?: string;
  port?: number;
  simulations: SimulationWithDist[];
  /**
   * Vite dev server instance for HMR mode.
   * When provided, resources are served as HTML that loads from Vite.
   * When not provided, resources serve pre-built HTML (production mode).
   */
  viteServer?: unknown; // ViteDevServer type, kept as unknown to avoid hard dependency
}
