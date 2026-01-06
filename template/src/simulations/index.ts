/**
 * Server-safe simulation configurations
 *
 * Auto-discovers all *-simulation.json files in this directory.
 * File naming: {resource}-{tool}-simulation.json (e.g., albums-show-simulation.json)
 *
 * This file can be safely imported in Node.js contexts (like MCP servers)
 * without causing issues with CSS imports or React components.
 */
import { createSimulationIndex } from 'sunpeak';

// Auto-discover all simulation JSON files
const simulationModules = import.meta.glob('./*-simulation.json', { eager: true });

// Build SIMULATIONS object from discovered files using library helper
export const SIMULATIONS = createSimulationIndex(simulationModules);
