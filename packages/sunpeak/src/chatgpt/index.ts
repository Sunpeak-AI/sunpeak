/**
 * ChatGPT-specific exports for the Sunpeak simulator.
 *
 * These components and utilities are designed for local development and testing,
 * simulating how resources render in ChatGPT's environment.
 *
 * @example
 * ```tsx
 * import { chatgpt, isChatGPT } from 'sunpeak';
 *
 * // Use the simulator for local development
 * function App() {
 *   return <chatgpt.ChatGPTSimulator simulations={simulations} />;
 * }
 *
 * // Check platform at runtime
 * if (isChatGPT()) {
 *   // Running in ChatGPT
 * }
 * ```
 *
 * @module sunpeak/chatgpt
 */

// Simulator component
export { ChatGPTSimulator } from './chatgpt-simulator';

// Simulator types
export type { Simulation } from '../types/simulation';
export type { ScreenWidth, SimulatorConfig } from './chatgpt-simulator-types';
export { SCREEN_WIDTHS } from './chatgpt-simulator-types';

// Host bridge (for building custom simulators or test harnesses)
export { McpAppHost } from './mcp-app-host';
export type { McpAppHostOptions } from './mcp-app-host';

// Iframe rendering (used internally by simulator)
export { IframeResource } from './iframe-resource';
export type { ResourceCSP } from './iframe-resource';

// Theme provider
export * from './theme-provider';

// URL helpers
export { createSimulatorUrl } from './simulator-url';
export type { SimulatorUrlParams } from './simulator-url';

// Discovery utilities for building simulations
export {
  buildDevSimulations,
  buildSimulations,
  buildResourceMap,
  createResourceExports,
  toPascalCase,
  extractResourceKey,
  extractSimulationKey,
  findResourceKey,
  getComponentName,
  findResourceDirs,
  isSimulationFile,
  extractSimulationName,
  findSimulationFiles,
} from '../lib/discovery';
export type {
  BuildSimulationsOptions,
  BuildDevSimulationsOptions,
  ResourceMetadata,
  ResourceDirInfo,
  FsOps,
} from '../lib/discovery';
