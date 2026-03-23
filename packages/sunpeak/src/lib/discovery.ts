/**
 * Discovery utilities for resources, tools, and simulations.
 *
 * String helpers (toPascalCase, extractResourceKey, etc.) are used by both
 * browser and Node.js code. Node.js utilities (findResourceDirs, findToolFiles,
 * etc.) are used by CLI commands for build-time and runtime discovery.
 */

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
    .filter(
      (entry) =>
        !entry.isDirectory() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')
    )
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
