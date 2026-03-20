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
 * Each subdirectory containing a {name}.tsx file is a valid resource.
 * @returns {string[]} Array of resource names
 */
export function discoverResources() {
  const resourcesDir = join(__dirname, '..', '..', 'template', 'src', 'resources');
  if (!existsSync(resourcesDir)) {
    return [];
  }
  return readdirSync(resourcesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => existsSync(join(resourcesDir, entry.name, `${entry.name}.tsx`)))
    .filter((entry) => !existsSync(join(resourcesDir, entry.name, '.internal')))
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

