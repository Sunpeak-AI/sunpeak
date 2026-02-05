import './chatgpt/globals.css';

// === MCP Apps SDK re-exports ===
// Re-export commonly used SDK exports for convenience
export {
  App,
  PostMessageTransport,
  RESOURCE_MIME_TYPE,
  RESOURCE_URI_META_KEY,
  applyHostStyleVariables,
  applyHostFonts,
  applyDocumentTheme,
  getDocumentTheme,
} from '@modelcontextprotocol/ext-apps';

// === Sunpeak core (cross-platform) ===
export * from './hooks';
export * from './types';
export * from './lib';

// === Platform detection (top-level for easy access) ===
export { isChatGPT, isClaude, detectPlatform } from './platform';
export type { Platform } from './platform';

// === ChatGPT-specific exports (namespaced) ===
// These are for the ChatGPT simulator and ChatGPT-specific development tools.
// Import as: import { chatgpt } from 'sunpeak';
// Usage: <chatgpt.ChatGPTSimulator ... />
export * as chatgpt from './chatgpt';
