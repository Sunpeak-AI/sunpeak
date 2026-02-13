#!/usr/bin/env node

/**
 * Generate example projects — one per resource discovered in the template.
 * Each example is scaffolded via `sunpeak new {resource}-example {resource}`.
 *
 * Usage: node scripts/generate-examples.mjs [--skip-install]
 *   or:  pnpm --filter sunpeak generate-examples
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { discoverResources } from '../bin/lib/patterns.mjs';

const skipInstall = process.argv.includes('--skip-install');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = join(__dirname, '..');
const REPO_ROOT = join(__dirname, '..', '..', '..');
const EXAMPLES_DIR = join(REPO_ROOT, 'examples');
const SUNPEAK_BIN = join(PACKAGE_ROOT, 'bin', 'sunpeak.js');

const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  blue: '\x1b[0;34m',
  yellow: '\x1b[1;33m',
  reset: '\x1b[0m',
};

function printSuccess(text) {
  console.log(`${colors.green}✓ ${text}${colors.reset}`);
}

console.log(`${colors.yellow}Generating examples...${colors.reset}\n`);

const resources = discoverResources();
if (resources.length === 0) {
  console.error(`${colors.red}No resources found in template/src/resources/${colors.reset}`);
  process.exit(1);
}

console.log(`Discovered resources: ${resources.join(', ')}`);
console.log(`Examples directory: ${EXAMPLES_DIR}\n`);

// Clean and recreate examples directory
if (existsSync(EXAMPLES_DIR)) {
  rmSync(EXAMPLES_DIR, { recursive: true });
}
mkdirSync(EXAMPLES_DIR, { recursive: true });

for (const resource of resources) {
  const exampleName = `${resource}-example`;
  console.log(`\n${colors.blue}Creating ${exampleName}...${colors.reset}`);

  const exampleDir = join(EXAMPLES_DIR, exampleName);

  try {
    execSync(`node ${SUNPEAK_BIN} new ${exampleName} ${resource}`, {
      cwd: EXAMPLES_DIR,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    });

    // Re-run install with --ignore-workspace so pnpm treats the example
    // as a standalone project instead of part of the monorepo workspace
    if (!skipInstall) {
      execSync('pnpm install --ignore-workspace', {
        cwd: exampleDir,
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: '1' },
      });
    }

    printSuccess(exampleName);
  } catch {
    console.error(`${colors.red}Failed to create ${exampleName}${colors.reset}`);
    process.exit(1);
  }
}

console.log(`\n${colors.green}All examples generated successfully!${colors.reset}\n`);
