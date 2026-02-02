import { execSync } from 'child_process';

/**
 * Detect package manager from environment or available commands.
 * Checks npm_config_user_agent first (set when running via npx/pnpm dlx/yarn dlx),
 * then falls back to checking which package managers are installed.
 */
export function detectPackageManager() {
  // Check npm_config_user_agent first (set by npm/pnpm/yarn when running scripts)
  const userAgent = process.env.npm_config_user_agent || '';
  if (userAgent.includes('pnpm')) return 'pnpm';
  if (userAgent.includes('yarn')) return 'yarn';
  if (userAgent.includes('npm')) return 'npm';

  // Fallback: check if commands exist
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    return 'pnpm';
  } catch {
    // pnpm not available
  }

  try {
    execSync('yarn --version', { stdio: 'ignore' });
    return 'yarn';
  } catch {
    // yarn not available
  }

  return 'npm';
}
