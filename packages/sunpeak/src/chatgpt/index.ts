/**
 * ChatGPT-specific exports for the Sunpeak inspector.
 *
 * @module sunpeak/chatgpt
 */

// Register ChatGPT host shell (side effect)
import './chatgpt-host';

// Inspector
export { Inspector } from '../inspector/inspector';

// Inspector types
export type { Simulation, ServerToolMock } from '../types/simulation';
export { resolveServerToolResult } from '../types/simulation';
export type { ScreenWidth, InspectorConfig } from '../inspector/inspector-types';
export { SCREEN_WIDTHS } from '../inspector/inspector-types';

// Host bridge (for building custom inspectors or test harnesses)
export { McpAppHost } from '../inspector/mcp-app-host';
export type { McpAppHostOptions } from '../inspector/mcp-app-host';

// Iframe rendering (used internally by inspector)
export { IframeResource, extractResourceCSP } from '../inspector/iframe-resource';
export type { ResourceCSP } from '../inspector/iframe-resource';

// Theme provider
export * from '../inspector/theme-provider';

// URL helpers
export { createInspectorUrl } from '../inspector/inspector-url';
export type { InspectorUrlParams } from '../inspector/inspector-url';

// Discovery utilities
export {
  toPascalCase,
  extractResourceKey,
  extractSimulationKey,
  findResourceKey,
  getComponentName,
  findResourceDirs,
} from '../lib/discovery';
export type { ResourceDirInfo, FsOps } from '../lib/discovery';
