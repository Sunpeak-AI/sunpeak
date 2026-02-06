/**
 * Discovery utilities for auto-discovering resources and simulations
 *
 * These helpers process the results of import.meta.glob() calls to extract
 * keys, build component maps, and connect simulations to resources.
 *
 * The glob calls themselves must remain in the template (Vite compile-time),
 * but all the processing logic lives here for easy updates across templates.
 *
 * Node.js utilities (findResourceDirs, isSimulationFile, etc.) can be used
 * by CLI commands for build-time and runtime discovery.
 */

import type { Simulation } from '../types/simulation.js';

/**
 * Convert a kebab-case string to PascalCase
 * @example toPascalCase('review') // 'Review'
 * @example toPascalCase('album-art') // 'AlbumArt'
 */
export function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Extract the resource key from a resource file path
 * @example extractResourceKey('./review-resource.tsx') // 'review'
 * @example extractResourceKey('../src/resources/albums-resource.tsx') // 'albums'
 */
export function extractResourceKey(path: string): string | undefined {
  const match = path.match(/([^/]+)-resource\.(tsx|json)$/);
  return match?.[1];
}

/**
 * Extract the simulation key from a simulation file path
 * @example extractSimulationKey('./albums-show-simulation.json') // 'albums-show'
 */
export function extractSimulationKey(path: string): string | undefined {
  const match = path.match(/([^/]+)-simulation\.json$/);
  return match?.[1];
}

/**
 * Find the best matching resource key for a simulation key.
 * Matches the longest resource name that is a prefix of the simulation key.
 * @example findResourceKey('albums-show', ['albums', 'album']) // 'albums'
 * @example findResourceKey('review-diff', ['review', 'carousel']) // 'review'
 */
export function findResourceKey(simulationKey: string, resourceKeys: string[]): string | undefined {
  // Sort by length descending to find longest match first
  const sorted = [...resourceKeys].sort((a, b) => b.length - a.length);
  for (const resourceKey of sorted) {
    if (simulationKey === resourceKey || simulationKey.startsWith(resourceKey + '-')) {
      return resourceKey;
    }
  }
  return undefined;
}

/**
 * Get the expected component export name for a resource
 * @example getComponentName('review') // 'ReviewResource'
 * @example getComponentName('album-art') // 'AlbumArtResource'
 */
export function getComponentName(resourceKey: string): string {
  return `${toPascalCase(resourceKey)}Resource`;
}

// --- Glob processing helpers ---

type GlobModules = Record<string, unknown>;

/**
 * Process resource component modules from import.meta.glob() result.
 * Extracts components and exports them with PascalCase names.
 *
 * @example
 * const modules = import.meta.glob('./**\/*-resource.tsx', { eager: true });
 * export default createResourceExports(modules);
 */
export function createResourceExports(modules: GlobModules): Record<string, React.ComponentType> {
  const resources: Record<string, React.ComponentType> = {};

  for (const [path, module] of Object.entries(modules)) {
    const key = extractResourceKey(path);
    if (!key) continue;

    const exportName = getComponentName(key);
    const mod = module as Record<string, unknown>;

    // Try default export first, then named export matching the expected name
    const component = mod.default ?? mod[exportName];

    // Accept functions (regular components) or objects (forwardRef/memo components)
    if (component && (typeof component === 'function' || typeof component === 'object')) {
      resources[exportName] = component as React.ComponentType;
    }
  }

  return resources;
}

/**
 * Build a resource metadata map from import.meta.glob() result.
 * Used for connecting simulations to their resource definitions.
 *
 * @example
 * const modules = import.meta.glob('../src/resources/**\/*-resource.tsx', { eager: true });
 * const resourcesMap = buildResourceMap(modules);
 */
export function buildResourceMap<T>(modules: GlobModules): Map<string, T> {
  const map = new Map<string, T>();

  for (const [path, module] of Object.entries(modules)) {
    const key = extractResourceKey(path);
    if (key) {
      map.set(key, (module as { resource: T }).resource);
    }
  }

  return map;
}

/**
 * Options for building simulations from discovered modules
 */
export interface BuildSimulationsOptions<TResource, TSimulation> {
  /** Glob result of simulation JSON files */
  simulationModules: GlobModules;
  /** Map of resource key -> resource metadata */
  resourcesMap: Map<string, TResource>;
  /** Map of component name -> React component */
  resourceComponents: Record<string, React.ComponentType>;
  /** Create the final simulation object */
  createSimulation: (
    simulationKey: string,
    simulationData: unknown,
    resource: TResource,
    resourceComponent: React.ComponentType
  ) => TSimulation;
  /** Optional warning handler for missing resources */
  onMissingResource?: (simulationKey: string, expectedPrefix: string) => void;
}

/**
 * Build simulations by connecting simulation data with resources and components.
 * This is the main orchestration function for dev server bootstrap.
 */
export function buildSimulations<TResource, TSimulation>(
  options: BuildSimulationsOptions<TResource, TSimulation>
): Record<string, TSimulation> {
  const {
    simulationModules,
    resourcesMap,
    resourceComponents,
    createSimulation,
    onMissingResource = (key, prefix) =>
      console.warn(
        `No matching resource found for simulation "${key}". ` +
          `Expected a resource file like src/resources/${prefix}/${prefix}-resource.tsx`
      ),
  } = options;

  const resourceKeys = Array.from(resourcesMap.keys());
  const simulations: Record<string, TSimulation> = {};

  for (const [path, module] of Object.entries(simulationModules)) {
    const simulationKey = extractSimulationKey(path);
    if (!simulationKey) continue;

    const simulationData = (module as { default: unknown }).default;

    // Find matching resource
    const resourceKey = findResourceKey(simulationKey, resourceKeys);
    if (!resourceKey) {
      onMissingResource(simulationKey, simulationKey.split('-')[0]);
      continue;
    }

    const resource = resourcesMap.get(resourceKey)!;

    // Get component
    const componentName = getComponentName(resourceKey);
    const resourceComponent = resourceComponents[componentName];

    if (!resourceComponent) {
      console.warn(
        `Resource component "${componentName}" not found for resource "${resourceKey}". ` +
          `Make sure src/resources/${resourceKey}/${resourceKey}-resource.tsx exists with a default export.`
      );
      continue;
    }

    simulations[simulationKey] = createSimulation(
      simulationKey,
      simulationData,
      resource,
      resourceComponent
    );
  }

  return simulations;
}

// --- Dev server helpers ---

/**
 * Resource metadata from *-resource.tsx files
 */
export interface ResourceMetadata {
  name: string;
  [key: string]: unknown;
}

/**
 * Options for building dev simulations
 */
export interface BuildDevSimulationsOptions {
  /** Glob result of simulation JSON files: import.meta.glob('*-simulation.json', { eager: true }) */
  simulationModules: GlobModules;
  /** Glob result of resource JSON files: import.meta.glob('*-resource.tsx', { eager: true }) */
  resourceModules: GlobModules;
  /** Resource components map from src/resources/index.ts */
  resourceComponents: Record<string, React.ComponentType>;
}

/**
 * Build simulations for the dev server from glob results.
 * This is the main entry point for dev.tsx bootstrap.
 *
 * @example
 * const simulations = buildDevSimulations({
 *   simulationModules: import.meta.glob('../src/resources/**\/*-simulation.json', { eager: true }),
 *   resourceModules: import.meta.glob('../src/resources/**\/*-resource.tsx', { eager: true }),
 *   resourceComponents: resourceComponents,
 * });
 */
export function buildDevSimulations(
  options: BuildDevSimulationsOptions
): Record<string, Simulation> {
  const { simulationModules, resourceModules, resourceComponents } = options;

  // Build resource metadata map
  const resourcesMap = buildResourceMap<ResourceMetadata>(resourceModules);

  // Build simulations with the standard dev server format
  return buildSimulations<ResourceMetadata, Simulation>({
    simulationModules,
    resourcesMap,
    resourceComponents,
    createSimulation: (simulationKey, simulationData, resource, resourceComponent) => {
      // Get the component name for the resource URL
      const resourceKey = findResourceKey(simulationKey, Array.from(resourcesMap.keys()));
      const componentName = resourceKey ? getComponentName(resourceKey) : '';

      return {
        ...(simulationData as Omit<Simulation, 'name' | 'resourceUrl' | 'resource'>),
        name: simulationKey,
        resource: {
          uri: `ui://${resource.name}`,
          ...resource,
        },
        // Generate URL to the resource loader with component name as query param
        resourceUrl: `/.sunpeak/resource-loader.html?component=${componentName}`,
        // Keep resourceComponent for backwards compatibility during transition
        // but it won't be used by the simulator anymore
        _resourceComponent: resourceComponent,
      } as Simulation;
    },
  });
}

// --- Node.js utilities for CLI commands ---
// These utilities use standard Node.js APIs and can be imported by build/push/mcp commands.

/**
 * Information about a discovered resource directory
 */
export interface ResourceDirInfo {
  /** Resource key (directory name), e.g., 'albums', 'carousel' */
  key: string;
  /** Full path to the resource directory */
  dir: string;
  /** Full path to the main resource file (tsx or json depending on context) */
  resourcePath: string;
}

/**
 * File system operations interface for dependency injection in tests
 */
export interface FsOps {
  readdirSync: (
    path: string,
    options: { withFileTypes: true }
  ) => Array<{ name: string; isDirectory: () => boolean }>;
  existsSync: (path: string) => boolean;
}

/**
 * Find all resource directories in a base directory.
 * Each valid resource directory contains a file matching the expected pattern.
 *
 * @param baseDir - Base directory to scan (e.g., 'src/resources' or 'dist')
 * @param filePattern - Function to generate expected filename from resource key
 * @param fs - File system operations (for testing)
 *
 * @example
 * // Find source resources (tsx files)
 * const resources = findResourceDirs('src/resources', key => `${key}-resource.tsx`);
 *
 * @example
 * // Find built resources (js files)
 * const resources = findResourceDirs('dist', key => `${key}.js`);
 */
export function findResourceDirs(
  baseDir: string,
  filePattern: (key: string) => string,
  fs: FsOps
): ResourceDirInfo[] {
  if (!fs.existsSync(baseDir)) {
    return [];
  }

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const key = entry.name;
      const dir = `${baseDir}/${key}`;
      const resourcePath = `${dir}/${filePattern(key)}`;

      if (!fs.existsSync(resourcePath)) {
        return null;
      }

      return { key, dir, resourcePath };
    })
    .filter((info): info is ResourceDirInfo => info !== null);
}

/**
 * Check if a filename is a simulation file for a given resource.
 * Matches pattern: {resourceKey}-*-simulation.json
 *
 * @example
 * isSimulationFile('albums-show-simulation.json', 'albums') // true
 * isSimulationFile('albums-show-simulation.json', 'carousel') // false
 * isSimulationFile('albums-resource.tsx', 'albums') // false
 */
export function isSimulationFile(filename: string, resourceKey: string): boolean {
  return filename.startsWith(`${resourceKey}-`) && filename.endsWith('-simulation.json');
}

/**
 * Extract the simulation name from a simulation filename.
 * Given "{resourceKey}-{name}-simulation.json", returns "{name}".
 *
 * @example
 * extractSimulationName('albums-show-simulation.json', 'albums') // 'show'
 * extractSimulationName('carousel-hero-simulation.json', 'carousel') // 'hero'
 */
export function extractSimulationName(filename: string, resourceKey: string): string {
  return filename.replace(`${resourceKey}-`, '').replace('-simulation.json', '');
}

/**
 * Find all simulation files in a resource directory.
 *
 * @param resourceDir - Path to the resource directory
 * @param resourceKey - Resource key (e.g., 'albums')
 * @param fs - File system operations (for testing)
 * @returns Array of { filename, name } objects
 */
export function findSimulationFiles(
  resourceDir: string,
  resourceKey: string,
  fs: Pick<FsOps, 'readdirSync' | 'existsSync'>
): Array<{ filename: string; name: string; path: string }> {
  if (!fs.existsSync(resourceDir)) {
    return [];
  }

  const entries = fs.readdirSync(resourceDir, { withFileTypes: true });

  return entries
    .filter((entry) => !entry.isDirectory() && isSimulationFile(entry.name, resourceKey))
    .map((entry) => ({
      filename: entry.name,
      name: extractSimulationName(entry.name, resourceKey),
      path: `${resourceDir}/${entry.name}`,
    }));
}
