/**
 * Shared patterns and utilities for CLI commands.
 * These mirror the patterns in src/lib/discovery.ts for consistency.
 */

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
