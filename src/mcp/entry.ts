#!/usr/bin/env node
/**
 * Internal MCP server entry point
 * This is run by nodemon or directly to start the MCP server
 *
 * Auto-discovers simulations and resources by file naming convention:
 * - simulations/{resource}-{tool}-simulation.json (e.g., albums-show-simulation.json)
 * - resources/{resource}-resource.json
 */
import { runMCPServer, type SimulationWithDist } from './index.js';
import path from 'path';
import { readFileSync, readdirSync } from 'fs';
import type { Resource } from '@modelcontextprotocol/sdk/types.js';

// Determine project root (where this is being run from)
const projectRoot = process.cwd();

/**
 * Find the best matching resource key for a simulation key.
 * Matches the longest resource name that is a prefix of the simulation key.
 * e.g., 'albums-show' matches 'albums' (not 'album' if both exist)
 */
function findResourceKey(simulationKey: string, resourceKeys: string[]): string | undefined {
  // Sort by length descending to find longest match first
  const sorted = [...resourceKeys].sort((a, b) => b.length - a.length);
  for (const resourceKey of sorted) {
    if (simulationKey === resourceKey || simulationKey.startsWith(resourceKey + '-')) {
      return resourceKey;
    }
  }
  return undefined;
}

async function startServer() {
  // Read package.json for app metadata
  const pkgPath = path.join(projectRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

  // Auto-discover resource files first (to build lookup map)
  const resourcesDir = path.join(projectRoot, 'src/resources');
  const resourceFiles = readdirSync(resourcesDir).filter((f) => f.endsWith('-resource.json'));

  const resourcesMap = new Map<string, Resource>();
  for (const filename of resourceFiles) {
    // Extract key from filename: 'counter-resource.json' -> 'counter'
    const key = filename.replace(/-resource\.json$/, '');
    const resourcePath = path.join(resourcesDir, filename);
    const resource = JSON.parse(readFileSync(resourcePath, 'utf-8')) as Resource;
    resourcesMap.set(key, resource);
  }

  const resourceKeys = Array.from(resourcesMap.keys());

  // Auto-discover simulation files
  const simulationsDir = path.join(projectRoot, 'src/simulations');
  const simulationFiles = readdirSync(simulationsDir).filter((f) => f.endsWith('-simulation.json'));

  // Build simulations array from discovered files
  const simulations: SimulationWithDist[] = [];

  for (const filename of simulationFiles) {
    // Extract simulation key from filename: 'albums-show-simulation.json' -> 'albums-show'
    const simulationKey = filename.replace(/-simulation\.json$/, '');

    // Load simulation data
    const simulationPath = path.join(simulationsDir, filename);
    const simulation = JSON.parse(readFileSync(simulationPath, 'utf-8'));

    // Find matching resource by best prefix match
    const resourceKey = findResourceKey(simulationKey, resourceKeys);
    if (!resourceKey) {
      console.warn(
        `No matching resource found for simulation "${simulationKey}". ` +
          `Expected a resource file like src/resources/${simulationKey.split('-')[0]}-resource.json`
      );
      continue;
    }

    const resource = resourcesMap.get(resourceKey)!;

    simulations.push({
      ...simulation,
      distPath: path.join(projectRoot, `dist/${resourceKey}.js`),
      resource,
    });
  }

  runMCPServer({
    name: pkg.name || 'Sunpeak',
    version: pkg.version || '0.1.0',
    simulations,
    port: 6766,
  });
}

startServer().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
