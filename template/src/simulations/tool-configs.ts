/**
 * Server-safe tool configurations
 *
 * This file contains only metadata and can be safely imported in Node.js contexts
 * (like MCP servers) without causing issues with CSS imports or React components.
 */

import { counterSimulationConfig } from './counter-simulation';
import { albumsSimulationConfig } from './albums-simulation';
import { carouselSimulationConfig } from './carousel-simulation';

export type { ToolConfig } from './types';

/**
 * Server-safe config map - contains only metadata, no React components
 */
export const TOOL_CONFIGS = {
  counter: counterSimulationConfig,
  albums: albumsSimulationConfig,
  carousel: carouselSimulationConfig,
} as const;

export type ToolName = keyof typeof TOOL_CONFIGS;
