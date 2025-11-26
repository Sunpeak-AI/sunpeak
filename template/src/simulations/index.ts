/**
 * Simulation configurations
 *
 * These configs contain only metadata and can be safely imported in Node.js contexts
 * (like MCP servers) without causing issues with CSS imports or React components.
 */

export { appSimulationConfig } from './app-simulation';
export { carouselSimulationConfig } from './carousel-simulation';
export { albumsSimulationConfig } from './albums-simulation';

/**
 * Simulations - DO NOT import in Node.js/MCP server contexts!
 * These include React components and CSS imports.
 */
export { appSimulation, albumsSimulation, carouselSimulation, simulations } from './simulations';
