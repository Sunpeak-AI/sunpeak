/**
 * Server-safe simulation configurations
 *
 * This file contains only metadata and can be safely imported in Node.js contexts
 * (like MCP servers) without causing issues with CSS imports or React components.
 */

import { counterSimulation } from './counter-simulation';
import { albumsSimulation } from './albums-simulation';
import { carouselSimulation } from './carousel-simulation';

export const SIMULATIONS = {
  counter: counterSimulation,
  albums: albumsSimulation,
  carousel: carouselSimulation,
} as const;
