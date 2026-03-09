export { runMCPServer, type MCPServerConfig, type MCPServerHandle } from './server.js';
export type {
  SimulationWithDist,
  AppToolConfig,
  ToolHandlerExtra,
  CallToolResult,
  AuthInfo,
} from './types.js';
export {
  createMcpHandler,
  createHandler,
  createProductionMcpServer,
  startProductionHttpServer,
  setJsonLogging,
} from './production-server.js';
export type {
  ProductionTool,
  ProductionResource,
  ProductionServerConfig,
  HttpServerOptions,
  AuthFunction,
  WebAuthFunction,
  WebHandlerConfig,
} from './production-server.js';
export { FAVICON_BASE64, FAVICON_BUFFER } from './favicon.js';

// Re-export ext-apps server helpers for custom MCP server setups
export {
  registerAppTool,
  registerAppResource,
  getUiCapability,
  EXTENSION_ID,
  RESOURCE_URI_META_KEY,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
export type {
  McpUiAppToolConfig,
  McpUiAppResourceConfig,
  ToolConfig,
  ToolCallback,
  ReadResourceCallback,
  ResourceMetadata,
} from '@modelcontextprotocol/ext-apps/server';
