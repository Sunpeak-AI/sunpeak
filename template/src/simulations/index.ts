/**
 * Server-safe simulation configurations
 * Safe to import in Node.js/MCP server contexts.
 */
export { SIMULATIONS, type SimulationConfig, type SimulationName } from './simulation-configs';

/**
 * Simulations - DO NOT import in Node.js/MCP server contexts!
 * These include React components and CSS imports.
 */
export { counterSimulation, albumsSimulation, carouselSimulation, simulations } from './simulations';
