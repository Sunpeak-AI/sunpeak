import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Detect package manager for the project
 */
export function detectPackageManager(projectRoot) {
  if (existsSync(join(projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(projectRoot, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(projectRoot, 'package-lock.json'))) return 'npm';
  return 'pnpm'; // default
}
