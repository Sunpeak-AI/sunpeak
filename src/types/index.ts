// Re-export common types from chatgpt.ts
export type {
  UnknownObject,
  Theme,
  SafeAreaInsets,
  SafeArea,
  DeviceType,
  UserAgent,
  DisplayMode,
  RequestDisplayMode,
  CallToolResponse,
  CallTool,
} from './chatgpt';

// ChatGPT-specific types
export type { ChatGPTGlobals } from './chatgpt';
export { SET_GLOBALS_EVENT_TYPE, SetGlobalsEvent } from './chatgpt';

// Platform-agnostic types
export type {
  PlatformGlobals,
  PlatformAPI,
  PlatformAdapter,
  PlatformType,
} from './platform';
