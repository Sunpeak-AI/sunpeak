/**
 * ChatGPT-specific exports for the Sunpeak simulator.
 *
 * @module sunpeak/chatgpt
 */

// Register ChatGPT host shell (side effect)
import './chatgpt-host';

// Simulator
export { Simulator } from '../simulator/simulator';

// Simulator types
export type { Simulation, ServerToolMock } from '../types/simulation';
export { resolveServerToolResult } from '../types/simulation';
export type { ScreenWidth, SimulatorConfig } from '../simulator/simulator-types';
export { SCREEN_WIDTHS } from '../simulator/simulator-types';

// Host bridge (for building custom simulators or test harnesses)
export { McpAppHost } from '../simulator/mcp-app-host';
export type { McpAppHostOptions } from '../simulator/mcp-app-host';

// Iframe rendering (used internally by simulator)
export { IframeResource, extractResourceCSP } from '../simulator/iframe-resource';
export type { ResourceCSP } from '../simulator/iframe-resource';

// Theme provider
export * from '../simulator/theme-provider';

// URL helpers
export { createSimulatorUrl } from '../simulator/simulator-url';
export type { SimulatorUrlParams } from '../simulator/simulator-url';

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
