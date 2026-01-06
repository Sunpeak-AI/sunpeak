/**
 * Auto-discovers and re-exports all resource components.
 *
 * Discovers all *-resource.tsx files and exports their component
 * with a PascalCase name (e.g., review-resource.tsx -> ReviewResource).
 *
 * Supports both export styles:
 * - Default export: export default MyComponent
 * - Named export: export const ReviewResource = ...
 */
import { createResourceExports } from 'sunpeak';

// Auto-discover all resource component files
const resourceModules = import.meta.glob('./*-resource.tsx', { eager: true });

// Build exports object from discovered files using library helper
export default createResourceExports(resourceModules);
