// === MCP Apps SDK React hooks (re-exported) ===
// These are the canonical implementations from the SDK
export { useApp } from './use-app';
export type { UseAppOptions, AppState } from './use-app';
export { useAutoResize } from '@modelcontextprotocol/ext-apps/react';
export { useDocumentTheme } from '@modelcontextprotocol/ext-apps/react';
export {
  useHostStyleVariables,
  useHostFonts,
  useHostStyles,
} from '@modelcontextprotocol/ext-apps/react';

// === Sunpeak core hooks (MCP Apps compatible) ===
// These provide additional functionality not in the SDK
export { useHostContext } from './use-host-context';
export { useToolData } from './use-tool-data';
export type { ToolData } from './use-tool-data';

// === Convenience hooks (thin wrappers around useHostContext) ===
export { useTheme } from './use-theme';
export { useDisplayMode } from './use-display-mode';
export { useLocale } from './use-locale';
export { useSafeArea } from './use-safe-area';
export { useViewport } from './use-viewport';
export { useIsMobile } from './use-mobile';

// === Action hooks (wrap App methods) ===
export { useCallServerTool } from './use-call-server-tool';
export type { CallServerToolParams, CallServerToolResult } from './use-call-server-tool';
export { useSendMessage } from './use-send-message';
export type { SendMessageParams, MessageContent } from './use-send-message';
export { useOpenLink } from './use-open-link';
export type { OpenLinkParams } from './use-open-link';
export { useRequestDisplayMode } from './use-request-display-mode';
export type { AppDisplayMode } from './use-request-display-mode';
export { useSendLog } from './use-send-log';
export type { LogLevel, SendLogParams } from './use-send-log';

// === Host info hooks ===
export { useHostInfo } from './use-host-info';
export type { HostVersion, HostCapabilities } from './use-host-info';

// === Event hooks (reactive state from App events) ===
export { useToolInputPartial } from './use-tool-input-partial';
export type { ToolInputPartial } from './use-tool-input-partial';
export { useToolCancelled } from './use-tool-cancelled';
export type { ToolCancelled } from './use-tool-cancelled';
export { useTeardown } from './use-teardown';

// === State management ===
export { useAppState } from './use-app-state';
