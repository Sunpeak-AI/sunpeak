#!/usr/bin/env node
/**
 * Internal MCP server entry point
 * This is run by nodemon or directly to start the MCP server
 * It automatically discovers the user's project and simulations
 */
import { runMCPServer, type SimulationWithDist } from './index.js';
import path from 'path';
import { readFileSync } from 'fs';

// Determine project root (where this is being run from)
const projectRoot = process.cwd();

async function startServer() {
  // Read package.json for app metadata
  const pkgPath = path.join(projectRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

  // Dynamically import user's simulations
  const simulationsPath = path.join(projectRoot, 'src/simulations/index.ts');
  const { SIMULATIONS } = await import(simulationsPath);

  // Add distPath to each simulation for the MCP server
  const simulations = Object.entries(
    SIMULATIONS as Record<string, Omit<SimulationWithDist, 'distPath'>>
  ).map(([simulationKey, simulation]) => ({
    ...simulation,
    distPath: path.join(projectRoot, `dist/chatgpt/${simulationKey}.js`),
  }));

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
