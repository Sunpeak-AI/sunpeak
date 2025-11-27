/**
 * Server-safe simulation configurations
 *
 * This file contains only metadata and can be safely imported in Node.js contexts
 * (like MCP servers) without causing issues with CSS imports or React components.
 */

import { counterSimulation } from './counter-simulation';
import { albumsSimulation } from './albums-simulation';
import { carouselSimulation } from './carousel-simulation';

export type { SimulationConfig } from './types';

/**
 * Server-safe simulation configs - contains only metadata, no React components
 */
export const SIMULATIONS = {
  counter: counterSimulation,
  albums: albumsSimulation,
  carousel: carouselSimulation,
} as const;

export type SimulationName = keyof typeof SIMULATIONS;
