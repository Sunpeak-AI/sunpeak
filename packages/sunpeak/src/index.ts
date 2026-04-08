import './inspector/globals.css';

// === MCP Apps SDK re-exports ===
// Core classes and style functions
export {
  App,
  PostMessageTransport,
  RESOURCE_MIME_TYPE,
  RESOURCE_URI_META_KEY,
  LATEST_PROTOCOL_VERSION,
  applyHostStyleVariables,
  applyHostFonts,
  applyDocumentTheme,
  getDocumentTheme,
} from '@modelcontextprotocol/ext-apps';

// Protocol method constants
export {
  INITIALIZE_METHOD,
  INITIALIZED_METHOD,
  OPEN_LINK_METHOD,
  MESSAGE_METHOD,
  REQUEST_DISPLAY_MODE_METHOD,
  REQUEST_TEARDOWN_METHOD,
  RESOURCE_TEARDOWN_METHOD,
  SIZE_CHANGED_METHOD,
  TOOL_INPUT_METHOD,
  TOOL_INPUT_PARTIAL_METHOD,
  TOOL_RESULT_METHOD,
  TOOL_CANCELLED_METHOD,
  HOST_CONTEXT_CHANGED_METHOD,
  DOWNLOAD_FILE_METHOD,
} from '@modelcontextprotocol/ext-apps';

// Zod schemas for runtime validation
export {
  McpUiThemeSchema,
  McpUiDisplayModeSchema,
  McpUiHostContextSchema,
  McpUiHostCapabilitiesSchema,
  McpUiAppCapabilitiesSchema,
  McpUiHostCssSchema,
  McpUiHostStylesSchema,
  McpUiInitializeRequestSchema,
  McpUiInitializeResultSchema,
  McpUiInitializedNotificationSchema,
  McpUiToolInputNotificationSchema,
  McpUiToolInputPartialNotificationSchema,
  McpUiToolResultNotificationSchema,
  McpUiToolCancelledNotificationSchema,
  McpUiHostContextChangedNotificationSchema,
  McpUiSizeChangedNotificationSchema,
  McpUiOpenLinkRequestSchema,
  McpUiOpenLinkResultSchema,
  McpUiMessageRequestSchema,
  McpUiMessageResultSchema,
  McpUiUpdateModelContextRequestSchema,
  McpUiRequestDisplayModeRequestSchema,
  McpUiRequestDisplayModeResultSchema,
  McpUiRequestTeardownNotificationSchema,
  McpUiResourceTeardownRequestSchema,
  McpUiResourceTeardownResultSchema,
  McpUiResourceCspSchema,
  McpUiResourcePermissionsSchema,
  McpUiResourceMetaSchema,
  McpUiToolVisibilitySchema,
  McpUiToolMetaSchema,
  McpUiSupportedContentBlockModalitiesSchema,
  McpUiDownloadFileRequestSchema,
  McpUiDownloadFileResultSchema,
} from '@modelcontextprotocol/ext-apps';

// Protocol request/result/notification types
export type {
  McpUiInitializeRequest,
  McpUiInitializeResult,
  McpUiOpenLinkRequest,
  McpUiOpenLinkResult,
  McpUiMessageRequest,
  McpUiMessageResult,
  McpUiUpdateModelContextRequest,
  McpUiRequestDisplayModeRequest,
  McpUiRequestDisplayModeResult,
  McpUiResourceTeardownRequest,
  McpUiResourceTeardownResult,
  McpUiToolInputNotification,
  McpUiToolInputPartialNotification,
  McpUiToolResultNotification,
  McpUiToolCancelledNotification,
  McpUiHostContextChangedNotification,
  McpUiInitializedNotification,
  McpUiSizeChangedNotification,
  McpUiRequestTeardownNotification,
  McpUiDownloadFileRequest,
  McpUiDownloadFileResult,
  AppRequest,
  AppNotification,
  AppResult,
  AppEventMap,
} from '@modelcontextprotocol/ext-apps';

// Event system base class
export { ProtocolWithEvents } from '@modelcontextprotocol/ext-apps';

// AppBridge event map (host-side)
export type { AppBridgeEventMap } from '@modelcontextprotocol/ext-apps/app-bridge';

// === Sunpeak core (cross-platform) ===
export * from './hooks';
export * from './types';
export * from './lib';

// === Host detection (top-level for easy access) ===
export { isChatGPT, isClaude, detectHost } from './host';
export type { Host } from './host';

// === Generic inspector (multi-host) ===
// Import as: import { inspector } from 'sunpeak';
// Usage: <inspector.Inspector ... />
export * as inspector from './inspector';

// === ChatGPT-specific exports (namespaced) ===
// Import as: import { chatgpt } from 'sunpeak';
export * as chatgpt from './chatgpt';
