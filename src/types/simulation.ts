/**
 * Core simulation types for development and testing.
 * These types define how simulations are configured and used in both
 * the dev simulator and MCP server contexts.
 */

import type * as React from 'react';
import type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';
import type { Theme, DisplayMode, UserAgent, SafeArea, View } from './index';

/**
 * Simulation globals that configure the simulator environment.
 * These values are passed to the mock runtime to set initial values for development/testing.
 * All fields are optional as simulations can use defaults.
 * Globals initialized based on tool responses are instead set in SimulationCallToolResult:
 *  (structuredContent > toolOutput, _meta > toolResponseMetadata)
 */
export interface SimulationGlobals {
  theme?: Theme;
  userAgent?: UserAgent;
  locale?: string;
  maxHeight?: number;
  displayMode?: DisplayMode;
  safeArea?: SafeArea;
  view?: View | null;
  toolInput?: Record<string, unknown>;
  widgetState?: Record<string, unknown> | null;
}

/**
 * MCP CallTool response data (subset used in simulations).
 * Note: toolOutput (structuredContent) and toolResponseMetadata (_meta)
 * are set here for use by the MCP server as well, not in SimulationGlobals.
 */
export interface SimulationCallToolResult {
  structuredContent?: Record<string, unknown> | null;
  _meta?: Record<string, unknown>;
}

/**
 * A simulation packages a component with its example data and metadata.
 * Each simulation represents a complete tool experience in the simulator.
 */
export interface Simulation {
  // Core simulation fields.
  resourceComponent: React.ComponentType;
  userMessage?: string; // Decoration for the simulator, no functional purpose.

  // Simulation globals for simulator environment (optional).
  simulationGlobals?: SimulationGlobals;

  // Official Tool type from the MCP SDK, used in ListTools response.
  tool: Tool;

  // Official Resource type from the MCP SDK, used in ListResources response.
  resource: Resource;

  // Official CallToolResultSchema from the MCP SDK, mock data for the CallTool response.
  toolCall?: SimulationCallToolResult;
}
