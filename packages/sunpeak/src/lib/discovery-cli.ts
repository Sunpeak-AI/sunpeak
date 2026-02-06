/**
 * CLI-safe discovery exports.
 *
 * This module re-exports only the Node.js-compatible discovery utilities
 * without pulling in React components. Used by CLI commands like `sunpeak dev`.
 */
export {
  findResourceDirs,
  findSimulationFiles,
  isSimulationFile,
  extractSimulationName,
  extractResourceKey,
  extractSimulationKey,
  toPascalCase,
  getComponentName,
  findResourceKey,
} from './discovery';

export type { ResourceDirInfo, FsOps } from './discovery';

export { extractResourceExport } from './extract-resource';
