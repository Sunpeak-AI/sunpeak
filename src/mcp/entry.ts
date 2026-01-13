#!/usr/bin/env node
/**
 * Internal MCP server entry point
 * This is run by nodemon or directly to start the MCP server
 *
 * Auto-discovers simulations and resources by file naming convention:
 * - resources/{resource}/{resource}-{scenario}-simulation.json (e.g., resources/albums/albums-show-simulation.json)
 * - resources/{resource}/{resource}-resource.json
 */
import { runMCPServer, type SimulationWithDist } from './index.js';
import path from 'path';
import { existsSync, readFileSync, readdirSync } from 'fs';
import type { Resource } from '@modelcontextprotocol/sdk/types.js';

// Determine project root (where this is being run from)
const projectRoot = process.cwd();

async function startServer() {
  // Read package.json for app metadata
  const pkgPath = path.join(projectRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

  // Auto-discover resources and simulations from subdirectories
  const resourcesDir = path.join(projectRoot, 'src/resources');
  const resourceDirs = readdirSync(resourcesDir, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory()
  );

  const resourcesMap = new Map<string, Resource>();
  const simulations: SimulationWithDist[] = [];

  for (const entry of resourceDirs) {
    const resourceKey = entry.name;
    const resourceDir = path.join(resourcesDir, resourceKey);
    const resourcePath = path.join(resourceDir, `${resourceKey}-resource.json`);

    // Skip directories without a resource file
    if (!existsSync(resourcePath)) {
      continue;
    }

    // Load resource
    const resource = JSON.parse(readFileSync(resourcePath, 'utf-8')) as Resource;
    resourcesMap.set(resourceKey, resource);

    // Discover simulation files in the same directory
    const dirFiles = readdirSync(resourceDir);
    for (const file of dirFiles) {
      if (file.endsWith('-simulation.json')) {
        // Extract simulation key from filename: 'albums-show-simulation.json' -> 'albums-show'
        const simulationKey = file.replace(/-simulation\.json$/, '');
        const simulationPath = path.join(resourceDir, file);
        const simulation = JSON.parse(readFileSync(simulationPath, 'utf-8'));

        simulations.push({
          ...simulation,
          name: simulationKey,
          distPath: path.join(projectRoot, `dist/${resourceKey}/${resourceKey}.js`),
          resource,
        });
      }
    }
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
