/**
 * Generic multi-host simulator for Sunpeak MCP Apps.
 *
 * The Simulator component provides a dev environment for testing MCP Apps
 * against multiple host platforms (ChatGPT, Claude, etc.).
 *
 * @example
 * ```tsx
 * import { simulator } from 'sunpeak';
 * const { Simulator, buildDevSimulations } = simulator;
 *
 * <Simulator simulations={simulations} appName="My App" />
 * ```
 *
 * @module sunpeak/simulator
 */

// Register built-in host shells
import '../chatgpt/chatgpt-host';
import '../claude/claude-host';

// Core simulator component
export { Simulator } from './simulator';
export type { SimulatorProps } from './simulator';

// State hook (for custom simulator builds)
export { useSimulatorState } from './use-simulator-state';
export type { UseSimulatorStateOptions, SimulatorState } from './use-simulator-state';

// Host shell system
export { registerHostShell, getHostShell, getRegisteredHosts } from './hosts';
export type { HostConversationProps, HostShell, HostId } from './hosts';

// Infrastructure
export { McpAppHost } from './mcp-app-host';
export type { McpAppHostOptions } from './mcp-app-host';
export { IframeResource, extractResourceCSP } from './iframe-resource';
export type { ResourceCSP } from './iframe-resource';
export { ThemeProvider, useThemeContext } from './theme-provider';

// Types & URL helpers
export type { ScreenWidth, SimulatorConfig } from './simulator-types';
export { SCREEN_WIDTHS } from './simulator-types';
export { createSimulatorUrl } from './simulator-url';
export type { SimulatorUrlParams } from './simulator-url';

// Sidebar components (for building custom simulators)
export {
  SimpleSidebar,
  SidebarControl,
  SidebarCollapsibleControl,
  SidebarSelect,
  SidebarInput,
  SidebarCheckbox,
  SidebarTextarea,
  SidebarToggle,
} from './simple-sidebar';

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
