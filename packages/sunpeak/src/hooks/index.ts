// === App context (provider + hook) ===
export { AppProvider } from './app-context';
export type { AppProviderProps, AppState } from './app-context';
export { useApp } from './use-app';

// === MCP Apps SDK React hooks (re-exported) ===
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
export type { Viewport } from './use-viewport';
export { useIsMobile } from './use-mobile';

// === Components ===
export { SafeArea } from './safe-area';
export type { SafeAreaProps } from './safe-area';

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
export { useTeardown } from './use-teardown';

// === State management ===
export { useAppState } from './use-app-state';
