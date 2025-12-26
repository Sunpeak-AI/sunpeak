/**
 * Server-safe simulation configurations
 *
 * Auto-discovers all *-simulation.json files in this directory.
 * File naming: {resource}-{tool}-simulation.json (e.g., albums-show-simulation.json)
 *
 * This file can be safely imported in Node.js contexts (like MCP servers)
 * without causing issues with CSS imports or React components.
 */

// Auto-discover all simulation JSON files
const simulationModules = import.meta.glob('./*-simulation.json', { eager: true });

// Build SIMULATIONS object from discovered files
// Key is the full name without -simulation.json suffix (e.g., 'albums-show')
export const SIMULATIONS = Object.fromEntries(
  Object.entries(simulationModules).map(([path, module]) => {
    // Extract simulation key from path: './albums-show-simulation.json' -> 'albums-show'
    const match = path.match(/\.\/(.+)-simulation\.json$/);
    const key = match?.[1] ?? path;
    return [key, (module as { default: unknown }).default];
  })
) as Record<string, unknown>;
