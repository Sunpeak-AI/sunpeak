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
export { useDeviceCapabilities } from './use-device-capabilities';
export type { DeviceCapabilities } from './use-device-capabilities';
export { useDisplayMode } from './use-display-mode';
export { useLocale } from './use-locale';
export { usePlatform } from './use-platform';
export type { HostPlatform } from './use-platform';
export { useSafeArea } from './use-safe-area';
export { useStyles } from './use-styles';
export { useTheme } from './use-theme';
export { useTimeZone } from './use-time-zone';
export { useToolInfo } from './use-tool-info';
export type { ToolInfo } from './use-tool-info';
export { useUserAgent } from './use-user-agent';
export { useViewport } from './use-viewport';
export type { Viewport } from './use-viewport';
export { useIsMobile } from './use-mobile';

// === Components ===
export { SafeArea } from './safe-area';
export type { SafeAreaProps } from './safe-area';

// === Action hooks (wrap App methods) ===
export { useCallServerTool } from './use-call-server-tool';
export type { CallServerToolParams, CallServerToolResult } from './use-call-server-tool';
export { useDownloadFile } from './use-download-file';
export type { DownloadFileParams, DownloadFileResult } from './use-download-file';
export { useListServerResources } from './use-list-server-resources';
export type {
  ListServerResourcesParams,
  ListServerResourcesResult,
  ServerResource,
} from './use-list-server-resources';
export { useOpenLink } from './use-open-link';
export type { OpenLinkParams } from './use-open-link';
export { useReadServerResource } from './use-read-server-resource';
export type {
  ReadServerResourceParams,
  ReadServerResourceResult,
} from './use-read-server-resource';
export { useRequestDisplayMode } from './use-request-display-mode';
export { useRequestTeardown } from './use-request-teardown';
export type { AppDisplayMode } from './use-request-display-mode';
export { useSendLog } from './use-send-log';
export type { LogLevel, SendLogParams } from './use-send-log';
export { useSendMessage } from './use-send-message';
export type { SendMessageParams, MessageContent } from './use-send-message';
export { useUpdateModelContext } from './use-update-model-context';
export type { UpdateModelContextParams } from './use-update-model-context';

// === Host info hooks ===
export { useHostInfo } from './use-host-info';
export type { HostVersion, HostCapabilities } from './use-host-info';

// === Event hooks (reactive state from App events) ===
export { useTeardown } from './use-teardown';

// === Bidirectional tool calling ===
export { useAppTools } from './use-app-tools';
export type { AppTool, AppToolsConfig } from './use-app-tools';

// === State management ===
export { useAppState } from './use-app-state';
