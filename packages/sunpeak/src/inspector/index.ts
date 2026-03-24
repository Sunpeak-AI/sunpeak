/**
 * Generic multi-host inspector for Sunpeak MCP Apps.
 *
 * The Inspector component provides a dev environment for testing MCP Apps
 * against multiple host platforms (ChatGPT, Claude, etc.).
 *
 * @example
 * ```tsx
 * import { inspector } from 'sunpeak';
 * const { Inspector } = inspector;
 *
 * <Inspector simulations={simulations} appName="My App" />
 * ```
 *
 * @module sunpeak/inspector
 */

// Register built-in host shells
import '../chatgpt/chatgpt-host';
import '../claude/claude-host';

// Core inspector component
export { Inspector } from './inspector';
export type { InspectorProps } from './inspector';

// State hook (for custom inspector builds)
export { useInspectorState } from './use-inspector-state';
export type { UseInspectorStateOptions, InspectorState } from './use-inspector-state';

// Host shell system
export { registerHostShell, getHostShell, getRegisteredHosts } from './hosts';
export type { HostConversationProps, HostShell, HostId } from './hosts';

// Infrastructure
export { McpAppHost } from './mcp-app-host';
export type { McpAppHostOptions } from './mcp-app-host';
export { IframeResource, extractResourceCSP } from './iframe-resource';
export type { ResourceCSP } from './iframe-resource';
export { ThemeProvider, useThemeContext } from './theme-provider';

// MCP connection
export { useMcpConnection } from './use-mcp-connection';
export type { McpConnectionState } from './use-mcp-connection';

// Simulation types & resolution
export type { Simulation, ServerToolMock } from '../types/simulation';
export { resolveServerToolResult } from '../types/simulation';

// Types & URL helpers
export type { ScreenWidth, InspectorConfig } from './inspector-types';
export { SCREEN_WIDTHS } from './inspector-types';
export { createInspectorUrl } from './inspector-url';
export type { InspectorUrlParams } from './inspector-url';

// Sidebar components (for building custom inspectors)
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
