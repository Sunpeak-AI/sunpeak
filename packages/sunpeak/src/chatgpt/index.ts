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

// Register ChatGPT host shell (side effect)
import './chatgpt-host';

// Legacy simulator component (kept for backwards compatibility)
export { ChatGPTSimulator } from './chatgpt-simulator';

// Generic simulator (preferred)
export { Simulator } from '../simulator/simulator';

// Simulator types
export type { Simulation } from '../types/simulation';
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
} from '../lib/discovery';
export type {
  BuildSimulationsOptions,
  BuildDevSimulationsOptions,
  ResourceMetadata,
  ResourceDirInfo,
  FsOps,
} from '../lib/discovery';
