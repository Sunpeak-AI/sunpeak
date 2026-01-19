#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Get the current installed version from package.json
 */
function getCurrentVersionImpl() {
  const pkgPath = join(__dirname, '..', '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  return pkg.version;
}

/**
 * Fetch the latest version from npm registry
 */
async function fetchLatestVersionImpl(packageName = 'sunpeak') {
  const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
  if (!response.ok) {
    throw new Error(`Failed to fetch latest version: ${response.status}`);
  }
  const data = await response.json();
  return data.version;
}

/**
 * Compare two semver versions
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(a, b) {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
}

/**
 * Detect which package manager is being used
 */
function detectPackageManagerImpl() {
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

/**
 * Run the upgrade command
 */
function runUpgradeImpl(packageManager, packageName = 'sunpeak') {
  const commands = {
    npm: ['npm', ['install', '-g', packageName]],
    pnpm: ['pnpm', ['add', '-g', packageName]],
    yarn: ['yarn', ['global', 'add', packageName]],
  };

  const [cmd, args] = commands[packageManager];

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Upgrade failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Default dependencies (real implementations)
 */
export const defaultDeps = {
  getCurrentVersion: getCurrentVersionImpl,
  fetchLatestVersion: fetchLatestVersionImpl,
  detectPackageManager: detectPackageManagerImpl,
  runUpgrade: runUpgradeImpl,
  console,
  process,
};

/**
 * Main upgrade command
 * @param {Object} options - Command options
 * @param {Object} deps - Dependencies (for testing). Uses defaultDeps if not provided.
 */
export async function upgrade(options = {}, deps = defaultDeps) {
  const d = { ...defaultDeps, ...deps };

  // Show help if requested
  if (options.help) {
    d.console.log(`
sunpeak upgrade - Upgrade sunpeak to the latest version

Usage:
  sunpeak upgrade [options]

Options:
  --check, -c     Check for updates without installing
  --help, -h      Show this help message

Examples:
  sunpeak upgrade          # Upgrade to latest version
  sunpeak upgrade --check  # Check if updates are available
`);
    return;
  }

  const currentVersion = d.getCurrentVersion();
  d.console.log(`Current version: ${currentVersion}`);
  d.console.log('Checking for updates...');

  let latestVersion;
  try {
    latestVersion = await d.fetchLatestVersion();
  } catch (error) {
    d.console.error(`Error checking for updates: ${error.message}`);
    d.process.exit(1);
    return;
  }

  const comparison = compareVersions(currentVersion, latestVersion);

  if (comparison >= 0) {
    d.console.log(`\n✓ You are already on the latest version (${currentVersion})`);
    return;
  }

  d.console.log(`\nNew version available: ${latestVersion}`);

  // If --check flag, just report and exit
  if (options.check) {
    d.console.log(`\nRun "sunpeak upgrade" to upgrade.`);
    return;
  }

  const packageManager = d.detectPackageManager();
  d.console.log(`\nUpgrading using ${packageManager}...`);

  try {
    await d.runUpgrade(packageManager);
    d.console.log(`\n✓ Successfully upgraded to sunpeak@${latestVersion}`);
  } catch (error) {
    d.console.error(`\nError upgrading: ${error.message}`);
    d.console.log(`\nYou can manually upgrade by running:`);
    d.console.log(`  ${packageManager} ${packageManager === 'yarn' ? 'global add' : packageManager === 'pnpm' ? 'add -g' : 'install -g'} sunpeak`);
    d.process.exit(1);
  }
}

// Export for testing
export { compareVersions };

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    check: args.includes('--check') || args.includes('-c'),
    help: args.includes('--help') || args.includes('-h'),
  };

  upgrade(options).catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
