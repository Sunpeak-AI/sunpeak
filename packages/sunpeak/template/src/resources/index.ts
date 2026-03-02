/**
 * Auto-discovers and re-exports all resource components.
 *
 * Discovers all {resource}/{resource}.tsx files and exports their component
 * with a PascalCase name (e.g., albums/albums.tsx -> AlbumsResource).
 *
 * Supports both export styles:
 * - Default export: export default MyComponent
 * - Named export: export const AlbumsResource = ...
 */
import { createResourceExports } from 'sunpeak';

// Auto-discover all resource component files in subdirectories (exclude test files)
const resourceModules = import.meta.glob(['./*/*.tsx', '!./*/*.test.tsx'], { eager: true });

// Build exports object from discovered files using library helper
export default createResourceExports(resourceModules);
