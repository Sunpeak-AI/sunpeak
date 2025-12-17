/**
 * Server-safe simulation configurations
 *
 * This file contains only metadata and can be safely imported in Node.js contexts
 * (like MCP servers) without causing issues with CSS imports or React components.
 */

import { counterSimulation } from './counter-simulation.js';
import { albumsSimulation } from './albums-simulation.js';
import { carouselSimulation } from './carousel-simulation.js';
import { pizzazSimulation } from './pizzaz-simulation.js';

export const SIMULATIONS = {
  counter: counterSimulation,
  albums: albumsSimulation,
  carousel: carouselSimulation,
  pizzaz: pizzazSimulation,
} as const;
