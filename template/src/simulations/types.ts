/**
 * Type definitions for simulations.
 */

import type { Simulation } from 'sunpeak';

/**
 * Server-safe simulation configuration.
 * This is a Simulation without the resourceComponent, safe to use in Node.js/MCP server contexts.
 * Contains metadata for both MCP server and simulation purposes.
 */
export type SimulationConfig = Omit<Simulation, 'resourceComponent'>;
