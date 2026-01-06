/**
 * Discovery utilities for auto-discovering resources and simulations
 *
 * These helpers process the results of import.meta.glob() calls to extract
 * keys, build component maps, and connect simulations to resources.
 *
 * The glob calls themselves must remain in the template (Vite compile-time),
 * but all the processing logic lives here for easy updates across templates.
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
 * @example extractResourceKey('../src/resources/albums-resource.json') // 'albums'
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
 * const modules = import.meta.glob('./*-resource.tsx', { eager: true });
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
 * Process simulation modules from import.meta.glob() result.
 * Builds a map of simulation key -> simulation data.
 *
 * @example
 * const modules = import.meta.glob('./*-simulation.json', { eager: true });
 * export const SIMULATIONS = createSimulationIndex(modules);
 */
export function createSimulationIndex(modules: GlobModules): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(modules)
      .map(([path, module]) => {
        const key = extractSimulationKey(path);
        if (!key) return null;
        return [key, (module as { default: unknown }).default];
      })
      .filter((entry): entry is [string, unknown] => entry !== null)
  );
}

/**
 * Build a resource metadata map from import.meta.glob() result.
 * Used for connecting simulations to their resource definitions.
 *
 * @example
 * const modules = import.meta.glob('../src/resources/*-resource.json', { eager: true });
 * const resourcesMap = buildResourceMap(modules);
 */
export function buildResourceMap<T>(modules: GlobModules): Map<string, T> {
  const map = new Map<string, T>();

  for (const [path, module] of Object.entries(modules)) {
    const key = extractResourceKey(path);
    if (key) {
      map.set(key, (module as { default: T }).default);
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
          `Expected a resource file like src/resources/${prefix}-resource.json`
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
          `Make sure src/resources/${resourceKey}-resource.tsx exists with a default export.`
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
 * Resource metadata from *-resource.json files
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
  /** Glob result of resource JSON files: import.meta.glob('*-resource.json', { eager: true }) */
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
 *   simulationModules: import.meta.glob('../src/simulations/*-simulation.json', { eager: true }),
 *   resourceModules: import.meta.glob('../src/resources/*-resource.json', { eager: true }),
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
    createSimulation: (simulationKey, simulationData, resource, resourceComponent) => ({
      ...(simulationData as Omit<Simulation, 'name' | 'resourceComponent' | 'resource'>),
      name: simulationKey,
      resource: {
        uri: `ui://${resource.name}`,
        ...resource,
      },
      resourceComponent,
    }),
  });
}
