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

// Auto-discover all resource component files
const resourceModules = import.meta.glob('./*-resource.tsx', { eager: true });

// Build exports object from discovered files
const resources: Record<string, React.ComponentType> = {};

for (const [path, module] of Object.entries(resourceModules)) {
  // Extract key from path: './review-resource.tsx' -> 'review'
  const match = path.match(/\.\/(.+)-resource\.tsx$/);
  const key = match?.[1];
  if (!key) continue;

  // Convert to PascalCase and append 'Resource': 'review' -> 'ReviewResource'
  const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
  const exportName = `${pascalKey}Resource`;

  const mod = module as Record<string, unknown>;

  // Try default export first, then named export matching the expected name
  const component = mod.default ?? mod[exportName];

  // Accept functions (regular components) or objects (forwardRef/memo components)
  if (component && (typeof component === 'function' || typeof component === 'object')) {
    resources[exportName] = component as React.ComponentType;
  }
}

export default resources;
