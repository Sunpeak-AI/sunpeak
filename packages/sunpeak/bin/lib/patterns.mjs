/**
 * Shared patterns and utilities for CLI commands.
 * These mirror the patterns in src/lib/discovery.ts for consistency.
 */

import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Auto-discover available resources from template/src/resources directories.
 * Each subdirectory containing a {name}-resource.tsx file is a valid resource.
 * @returns {string[]} Array of resource names
 */
export function discoverResources() {
  const resourcesDir = join(__dirname, '..', '..', 'template', 'src', 'resources');
  if (!existsSync(resourcesDir)) {
    return [];
  }
  return readdirSync(resourcesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => {
      const resourceFile = join(resourcesDir, entry.name, `${entry.name}-resource.tsx`);
      return existsSync(resourceFile);
    })
    .map((entry) => entry.name);
}

/**
 * Convert a kebab-case string to PascalCase
 * @param {string} str
 * @returns {string}
 * @example toPascalCase('review') // 'Review'
 * @example toPascalCase('album-art') // 'AlbumArt'
 */
export function toPascalCase(str) {
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Check if a filename is a simulation file for a given resource.
 * @param {string} filename
 * @param {string} resourceKey
 * @returns {boolean}
 * @example isSimulationFile('albums-show-simulation.json', 'albums') // true
 */
export function isSimulationFile(filename, resourceKey) {
  return filename.startsWith(`${resourceKey}-`) && filename.endsWith('-simulation.json');
}

/**
 * Extract the simulation name from a simulation filename.
 * @param {string} filename
 * @param {string} resourceKey
 * @returns {string}
 * @example extractSimulationName('albums-show-simulation.json', 'albums') // 'show'
 */
export function extractSimulationName(filename, resourceKey) {
  return filename.replace(`${resourceKey}-`, '').replace('-simulation.json', '');
}
