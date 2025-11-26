/**
 * Server-safe app configurations
 *
 * This file contains only metadata and can be safely imported in Node.js contexts
 * (like MCP servers) without causing issues with CSS imports or React components.
 *
 * To switch apps, change ACTIVE_APP in components/apps/active-app.ts
 */

import { ACTIVE_APP } from '../components/apps/active-app';
import { appSimulationConfig } from './app-simulation';
import { albumsSimulationConfig } from './albums-simulation';
import { carouselSimulationConfig } from './carousel-simulation';

/**
 * Server-safe config map - contains only metadata, no React components
 */
export const CONFIG_MAP = {
  app: appSimulationConfig,
  albums: albumsSimulationConfig,
  carousel: carouselSimulationConfig,
} as const;

export type AppName = keyof typeof CONFIG_MAP;

// Re-export for convenience
export { ACTIVE_APP };

// Active config for server use
export const activeConfig = CONFIG_MAP[ACTIVE_APP];
