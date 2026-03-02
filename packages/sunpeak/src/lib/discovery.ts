/**
 * Discovery utilities for auto-discovering resources and simulations
 *
 * These helpers process the results of import.meta.glob() calls to extract
 * keys, build component maps, and connect simulations to resources.
 *
 * The glob calls themselves must remain in the template (Vite compile-time),
 * but all the processing logic lives here for easy updates across templates.
 *
 * Node.js utilities (findResourceDirs, findToolFiles, etc.) can be used
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
 * Extract the resource key from a resource file path.
 * Matches {name}.tsx (e.g., './albums/albums.tsx' → 'albums')
 */
export function extractResourceKey(path: string): string | undefined {
  const match = path.match(/([^/]+)\.tsx$/);
  return match ? match[1] : undefined;
}

/**
 * Extract the simulation key from a simulation file path.
 * Matches any *.json file (e.g., './show-albums.json' → 'show-albums')
 */
export function extractSimulationKey(path: string): string | undefined {
  const match = path.match(/([^/]+)\.json$/);
  return match ? match[1] : undefined;
}

/**
 * Find the best matching resource key for a simulation key.
 * Matches the longest resource name that is a prefix of the simulation key.
 * @example findResourceKey('review-diff', ['review', 'carousel']) // 'review'
 * @example findResourceKey('albums', ['albums', 'review']) // 'albums'
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
 * const modules = import.meta.glob('./*\/*.tsx', { eager: true });
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
 * const modules = import.meta.glob('../src/resources/*\/*.tsx', { eager: true });
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
          `Expected a resource file like src/resources/${prefix}/${prefix}.tsx`
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
          `Make sure src/resources/${resourceKey}/${resourceKey}.tsx exists with a default export.`
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
 * Resource metadata from resource .tsx files
 */
export interface ResourceMetadata {
  name: string;
  [key: string]: unknown;
}

/**
 * Options for building dev simulations
 */
export interface BuildDevSimulationsOptions {
  /** Glob result of simulation JSON files */
  simulationModules: GlobModules;
  /** Resource components map from src/resources/index.ts */
  resourceComponents: Record<string, React.ComponentType>;
  /** Glob result of tool files: import.meta.glob('src/tools/*.ts', { eager: true }) */
  toolModules: GlobModules;
  /** Glob result of resource .tsx files from src/resources/ */
  resourceModules: GlobModules;
}

/**
 * Tool metadata extracted from a tool module's `tool` export
 */
interface ToolModuleInfo {
  tool: Record<string, unknown>;
  /** Resource name string from tool.resource */
  resourceName: string;
}

/**
 * Build simulations for the dev server from glob results.
 * Simulation JSON has `"tool": "tool-name"` string referencing a tool file.
 * Tool files have `resource: 'name'` linking to a resource discovered from resourceModules.
 */
export function buildDevSimulations(
  options: BuildDevSimulationsOptions
): Record<string, Simulation> {
  const { simulationModules, resourceComponents, toolModules, resourceModules } = options;

  // Build resource metadata map from resource modules (keyed by resource name)
  const resourceMetaByName = new Map<string, ResourceMetadata>();
  const resourceKeyByName = new Map<string, string>();
  for (const [path, module] of Object.entries(resourceModules)) {
    const key = extractResourceKey(path);
    if (!key) continue;
    const mod = module as { resource?: ResourceMetadata };
    if (mod.resource) {
      // Use explicit name if provided, otherwise derive from directory key
      const name = mod.resource.name ?? key;
      resourceMetaByName.set(name, { ...mod.resource, name });
      resourceKeyByName.set(name, key);
    }
  }

  // Build tool map from tool modules
  const toolsMap = new Map<string, ToolModuleInfo>();
  if (toolModules) {
    for (const [path, module] of Object.entries(toolModules)) {
      const nameMatch = path.match(/([^/]+)\.ts$/);
      if (!nameMatch) continue;
      const mod = module as { tool?: Record<string, unknown> };
      if (mod.tool) {
        const resourceName = mod.tool.resource as string | undefined;
        if (resourceName) {
          toolsMap.set(nameMatch[1], { tool: mod.tool, resourceName });
        }
      }
    }
  }

  const simulations: Record<string, Simulation> = {};

  for (const [path, module] of Object.entries(simulationModules)) {
    const simKey = extractSimulationKey(path);
    if (!simKey) continue;

    const simulationData = (module as { default: Record<string, unknown> }).default;

    const toolName =
      typeof simulationData.tool === 'string' ? (simulationData.tool as string) : simKey;
    const toolInfo = toolsMap.get(toolName);
    if (!toolInfo) {
      console.warn(
        `Tool "${toolName}" not found for simulation "${simKey}". ` +
          `Make sure src/tools/${toolName}.ts exists.`
      );
      continue;
    }

    // Look up resource metadata by name
    const resourceMeta = resourceMetaByName.get(toolInfo.resourceName);
    const resourceKey = resourceKeyByName.get(toolInfo.resourceName);
    if (!resourceMeta || !resourceKey) {
      console.warn(
        `Resource "${toolInfo.resourceName}" not found for tool "${toolName}". ` +
          `Make sure a resource with name "${toolInfo.resourceName}" exists in src/resources/.`
      );
      continue;
    }

    const componentName = getComponentName(resourceKey);
    const resourceComponent = resourceComponents[componentName];

    if (!resourceComponent) {
      console.warn(`Resource component "${componentName}" not found for tool "${toolName}".`);
      continue;
    }

    simulations[simKey] = {
      name: simKey,
      userMessage: simulationData.userMessage as string | undefined,
      tool: {
        name: toolName,
        description: (toolInfo.tool.description as string) ?? '',
        inputSchema: { type: 'object' as const },
        ...(toolInfo.tool.title != null ? { title: toolInfo.tool.title as string } : {}),
        ...(toolInfo.tool.annotations != null
          ? { annotations: toolInfo.tool.annotations as Record<string, unknown> }
          : {}),
        ...(toolInfo.tool._meta != null
          ? { _meta: toolInfo.tool._meta as Record<string, unknown> }
          : {}),
      },
      resource: {
        uri: `ui://${resourceKey}`,
        name: resourceKey,
        ...(resourceMeta.title != null ? { title: resourceMeta.title as string } : {}),
        ...(resourceMeta.description != null
          ? { description: resourceMeta.description as string }
          : {}),
        ...(resourceMeta.mimeType != null ? { mimeType: resourceMeta.mimeType as string } : {}),
        ...(resourceMeta._meta != null
          ? { _meta: resourceMeta._meta as Record<string, unknown> }
          : {}),
      },
      toolInput: simulationData.toolInput as Record<string, unknown> | undefined,
      toolResult: simulationData.toolResult as Simulation['toolResult'],
      resourceUrl: `/.sunpeak/resource-loader.html?component=${componentName}`,
    };
  }

  return simulations;
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
 * const resources = findResourceDirs('src/resources', key => `${key}.tsx`);
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

// --- Tool files + flat simulations discovery ---

/**
 * Information about a discovered tool file
 */
export interface ToolFileInfo {
  /** Tool name derived from filename (e.g., 'show-albums') */
  name: string;
  /** Full path to the tool file */
  path: string;
}

/**
 * Find all tool files in a tools directory.
 * Matches *.ts files directly in the directory (not recursive).
 *
 * @example
 * findToolFiles('src/tools', fs)
 * // [{ name: 'show-albums', path: 'src/tools/show-albums.ts' }]
 */
export function findToolFiles(
  toolsDir: string,
  fs: Pick<FsOps, 'readdirSync' | 'existsSync'>
): ToolFileInfo[] {
  if (!fs.existsSync(toolsDir)) {
    return [];
  }

  const entries = fs.readdirSync(toolsDir, { withFileTypes: true });

  return entries
    .filter((entry) => !entry.isDirectory() && entry.name.endsWith('.ts'))
    .map((entry) => ({
      name: entry.name.replace(/\.ts$/, ''),
      path: `${toolsDir}/${entry.name}`,
    }));
}

/**
 * Information about a discovered simulation file (flat convention)
 */
export interface SimulationFileInfo {
  /** Filename without extension (e.g., 'show-albums') */
  name: string;
  /** Full path to the simulation file */
  path: string;
}

/**
 * Find all simulation JSON files in a flat simulations directory.
 * Matches any *.json file directly in the directory.
 *
 * @example
 * findSimulationFilesFlat('tests/simulations', fs)
 * // [{ name: 'show-albums', path: 'tests/simulations/show-albums.json' }]
 */
export function findSimulationFilesFlat(
  simulationsDir: string,
  fs: Pick<FsOps, 'readdirSync' | 'existsSync'>
): SimulationFileInfo[] {
  if (!fs.existsSync(simulationsDir)) {
    return [];
  }

  const entries = fs.readdirSync(simulationsDir, { withFileTypes: true });

  return entries
    .filter((entry) => !entry.isDirectory() && entry.name.endsWith('.json'))
    .map((entry) => ({
      name: entry.name.replace(/\.json$/, ''),
      path: `${simulationsDir}/${entry.name}`,
    }));
}
