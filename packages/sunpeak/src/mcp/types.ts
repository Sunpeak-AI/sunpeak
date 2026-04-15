import type {
  Resource,
  Tool,
  Implementation,
  ServerRequest,
  ServerNotification,
} from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ToolConfig } from '@modelcontextprotocol/ext-apps/server';
import type { ServerToolMock } from '../types/simulation';

export type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
export type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

/**
 * Server identity configuration, exported from `src/server.ts` as `server`.
 *
 * All fields from the MCP SDK's `Implementation` type are supported:
 * `name`, `version`, `title`, `description`, `websiteUrl`, `icons`.
 *
 * Icons must be **64x64 PNG** for ChatGPT compatibility. Use a `data:` URI
 * to embed the icon inline so the host doesn't need to fetch it separately.
 * Light/dark theme variants are supported via the `theme` field.
 *
 * If omitted, a default sunpeak icon is used.
 *
 * @example
 * ```ts
 * export const server: ServerConfig = {
 *   name: 'my-app',
 *   version: '1.0.0',
 *   description: 'My MCP app',
 *   icons: [
 *     { src: 'data:image/png;base64,...', mimeType: 'image/png', sizes: ['64x64'] },
 *     { src: 'data:image/png;base64,...', mimeType: 'image/png', sizes: ['64x64'], theme: 'dark' },
 *   ],
 * };
 * ```
 */
export type ServerConfig = Partial<Implementation>;

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
  /** The resource name (must match a directory in `src/resources/`, e.g. `'albums'`). Omit for tools without a UI. */
  resource?: string;
}

/**
 * Simulation configuration for MCP server.
 * Must include distPath for the built HTML file.
 */
export interface SimulationWithDist {
  // Unique identifier derived from the simulation filename (e.g., 'show-albums')
  name: string;

  // Path to the built HTML file (for production mode). Undefined for tools without a UI.
  distPath?: string;

  // Path to the source TSX file (for Vite dev mode)
  srcPath?: string;

  // MCP Tool protocol - official Tool type from MCP SDK used in ListTools response
  tool: Tool;

  // MCP Resource protocol - official Resource type from MCP SDK used in ListResources response
  // MCP Resource metadata (name, uri, description, _meta). Undefined for tools without a UI.
  resource?: Resource;

  // Tool result data for CallTool response
  toolResult?: {
    content?: Array<{ type: string; text: string }>;
    structuredContent?: unknown;
    isError?: boolean;
  };

  // Raw Zod shape (Record<string, ZodType>) from the tool module's `schema` export.
  // Passed to the MCP SDK's registerTool so that tools/list reports actual
  // parameter schemas instead of empty objects. The MCP SDK duck-types
  // Zod values, so raw shapes from Vite SSR work across module instances.
  // Falls back to z.object({}).passthrough() when absent.
  inputSchema?: unknown;

  // Output schema Zod shape from the tool module's `outputSchema` export.
  // Typed as `unknown` because it's loaded dynamically via Vite SSR —
  // at runtime it will be a Zod shape (Record<string, ZodType>).
  outputSchema?: unknown;

  // Real handler for backend-only tools (loaded via Vite SSR in dev mode).
  // When present, the dev MCP server calls this instead of returning mock data.
  handler?: (args: Record<string, unknown>, extra: unknown) => unknown | Promise<unknown>;

  // Mock responses for callServerTool calls made by the resource.
  // Passed through from simulation JSON.
  serverTools?: Record<string, ServerToolMock>;
}

/**
 * Handle returned by `runMCPServer` for controlling the running server.
 */
export interface MCPServerHandle {
  /**
   * Promise that resolves when the HTTP server is listening.
   * Useful for callers that need to connect to the server immediately after starting it.
   */
  ready: Promise<void>;

  /**
   * Notify non-local sessions that resources have changed.
   * Sends `notifications/resources/list_changed` so hosts re-fetch fresh content.
   * Local sessions (ChatGPT, inspector) are skipped since they use Vite HMR.
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
  /** Full server identity (overrides name/version when provided). */
  serverInfo?: ServerConfig;
  port?: number;
  /** HMR WebSocket port (used for CSP injection in dev mode). */
  hmrPort?: number;
  simulations: SimulationWithDist[];
  /**
   * Vite dev server instance for HMR mode.
   * When provided, resources are served as HTML that loads from Vite.
   * When not provided, resources serve pre-built HTML (production mode).
   */
  viteServer?: unknown; // ViteDevServer type, kept as unknown to avoid hard dependency
  /**
   * When true, UI tool calls always use the real handler (bypassing simulation
   * mock data). When false (default), UI tools with structuredContent in their
   * simulation return mock data — real handlers are only used for backend-only
   * tools. Set by `--prod-tools` flag in `sunpeak dev`.
   */
  prodTools?: boolean;
}
