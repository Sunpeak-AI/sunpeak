#!/usr/bin/env node

/**
 * Local Testing Script for Sunpeak
 * This script runs all local tests described in DEVELOPMENT.md
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { discoverResources } from '../bin/lib/patterns.mjs';

// Color codes for output
const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  blue: '\x1b[0;34m',
  yellow: '\x1b[1;33m',
  reset: '\x1b[0m',
};

// Get repo root and package root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = join(__dirname, '..');
const REPO_ROOT = join(__dirname, '..', '..', '..');

// Helper functions
function printSection(text) {
  console.log(`\n${colors.blue}${'='.repeat(40)}${colors.reset}`);
  console.log(`${colors.blue}${text}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(40)}${colors.reset}\n`);
}

function printSuccess(text) {
  console.log(`${colors.green}✓ ${text}${colors.reset}`);
}

function runCommand(command, cwd) {
  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    return true;
  } catch (error) {
    return false;
  }
}


// Main testing flow
console.log(`${colors.yellow}Starting local testing for Sunpeak...${colors.reset}`);
console.log(`Repository root: ${REPO_ROOT}`);
console.log(`Package root: ${PACKAGE_ROOT}\n`);

try {
  // Package level tests
  printSection('PACKAGE LEVEL TESTS');

  console.log('Running: pnpm install');
  if (!runCommand('pnpm install', REPO_ROOT)) {
    throw new Error('pnpm install failed');
  }
  console.log()
  printSuccess('pnpm install');

  console.log('\nRunning: pnpm format');
  if (!runCommand('pnpm format', PACKAGE_ROOT)) {
    throw new Error('pnpm format failed');
  }
  printSuccess('pnpm format');

  console.log('\nRunning: pnpm lint');
  if (!runCommand('pnpm lint', PACKAGE_ROOT)) {
    throw new Error('pnpm lint failed');
  }
  printSuccess('pnpm lint');

  console.log('\nRunning: pnpm build');
  if (!runCommand('pnpm build', PACKAGE_ROOT)) {
    throw new Error('pnpm build failed');
  }
  console.log()
  printSuccess('pnpm build');

  console.log('\nRunning: pnpm typecheck');
  if (!runCommand('pnpm typecheck', PACKAGE_ROOT)) {
    throw new Error('pnpm typecheck failed');
  }
  printSuccess('pnpm typecheck');

  console.log('\nRunning: pnpm test');
  if (!runCommand('pnpm test', PACKAGE_ROOT)) {
    throw new Error('pnpm test failed');
  }
  printSuccess('pnpm test');

  // Example projects
  printSection('EXAMPLE PROJECTS');

  const EXAMPLES_DIR = join(REPO_ROOT, 'examples');
  const SUNPEAK_BIN = join(PACKAGE_ROOT, 'bin', 'sunpeak.js');
  const resources = discoverResources();

  console.log(`Discovered resources: ${resources.join(', ')}`);

  // Generate all examples
  console.log('\nGenerating examples...');
  if (!runCommand(`node ${join(PACKAGE_ROOT, 'scripts', 'generate-examples.mjs')} --skip-install`, REPO_ROOT)) {
    throw new Error('Example generation failed');
  }
  printSuccess('Examples generated');

  // Link local sunpeak, install, build, and test each example
  let playwrightInstalled = false;

  for (const resource of resources) {
    const exampleName = `${resource}-example`;
    const exampleDir = join(EXAMPLES_DIR, exampleName);

    printSection(`TESTING: ${exampleName}`);

    // Link local sunpeak package
    console.log('Linking local sunpeak package...');
    const pkgPath = join(exampleDir, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    pkg.dependencies.sunpeak = `file:${PACKAGE_ROOT}`;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    printSuccess('Linked local sunpeak');

    console.log('\nRunning: pnpm install');
    if (!runCommand('pnpm install --ignore-workspace --no-frozen-lockfile', exampleDir)) {
      throw new Error(`pnpm install failed in ${exampleName}`);
    }
    printSuccess('pnpm install');

    // Unit tests
    console.log('\nRunning: pnpm test');
    if (!runCommand('pnpm test', exampleDir)) {
      throw new Error(`Tests failed in ${exampleName}`);
    }
    printSuccess('pnpm test');

    // Build
    console.log('\nRunning: sunpeak build');
    if (!runCommand(`node ${SUNPEAK_BIN} build`, exampleDir)) {
      throw new Error(`Build failed in ${exampleName}`);
    }
    printSuccess('sunpeak build');

    // Install Playwright browsers once
    if (!playwrightInstalled) {
      console.log('\nInstalling Playwright browsers...');
      if (!runCommand('pnpm exec playwright install chromium --with-deps', exampleDir)) {
        console.log('Note: Browser installation may require additional system dependencies');
      }
      playwrightInstalled = true;
      printSuccess('Playwright browsers');
    }

    // E2E tests
    console.log('\nRunning: pnpm test:e2e');
    if (!runCommand('pnpm test:e2e', exampleDir)) {
      throw new Error(`E2E tests failed in ${exampleName}`);
    }
    printSuccess('pnpm test:e2e');

    printSuccess(`${exampleName} passed!\n`);
  }

  // Regenerate clean examples (undo file: linking)
  console.log('\nRegenerating clean examples...');
  if (!runCommand(`node ${join(PACKAGE_ROOT, 'scripts', 'generate-examples.mjs')} --skip-install`, REPO_ROOT)) {
    console.log('Note: Failed to regenerate clean examples');
  }
  printSuccess('Clean examples restored');

  printSuccess('SHIP IT!\n\n');
  process.exit(0);
} catch (error) {
  console.error(`\n${colors.red}Error: ${error.message}${colors.reset}\n`);
  process.exit(1);
}
