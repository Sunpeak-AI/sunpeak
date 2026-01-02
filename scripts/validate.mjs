#!/usr/bin/env node

/**
 * Local Testing Script for Sunpeak
 * This script runs all local tests described in DEVELOPMENT.md
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

// Color codes for output
const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  blue: '\x1b[0;34m',
  yellow: '\x1b[1;33m',
  reset: '\x1b[0m',
};

// Get repo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');

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
console.log(`Repository root: ${REPO_ROOT}\n`);

try {
  // Root level tests
  printSection('ROOT LEVEL TESTS');

  console.log('Running: pnpm install');
  if (!runCommand('pnpm install', REPO_ROOT)) {
    throw new Error('pnpm install failed');
  }
  console.log()
  printSuccess('pnpm install');

  console.log('\nRunning: pnpm format');
  if (!runCommand('pnpm format', REPO_ROOT)) {
    throw new Error('pnpm format failed');
  }
  printSuccess('pnpm format');

  console.log('\nRunning: pnpm lint');
  if (!runCommand('pnpm lint', REPO_ROOT)) {
    throw new Error('pnpm lint failed');
  }
  printSuccess('pnpm lint');

  console.log('\nRunning: pnpm build');
  if (!runCommand('pnpm build', REPO_ROOT)) {
    throw new Error('pnpm build failed');
  }
  console.log()
  printSuccess('pnpm build');

  console.log('\nRunning: pnpm typecheck');
  if (!runCommand('pnpm typecheck', REPO_ROOT)) {
    throw new Error('pnpm typecheck failed');
  }
  printSuccess('pnpm typecheck');

  console.log('\nRunning: pnpm test');
  if (!runCommand('pnpm test', REPO_ROOT)) {
    throw new Error('pnpm test failed');
  }
  printSuccess('pnpm test');

  // Template level tests
  printSection('TEMPLATE LEVEL TESTS');

  const templateDir = join(REPO_ROOT, 'template');

  console.log('Running: pnpm install (template)');
  if (!runCommand('pnpm install', templateDir)) {
    throw new Error('pnpm install failed in template');
  }
  console.log()
  printSuccess('pnpm install (template)');

  console.log('\nRunning: pnpm test (template)');
  if (!runCommand('pnpm test', templateDir)) {
    throw new Error('pnpm test failed in template');
  }
  printSuccess('pnpm test (template)');

  console.log('\nRunning: sunpeak build (template)');
  if (!runCommand('node ../bin/sunpeak.js build', templateDir)) {
    throw new Error('sunpeak build failed in template');
  }
  console.log()
  printSuccess('sunpeak build (template)');

  console.log('Checking: Playwright browsers');
  if (!runCommand('pnpm exec playwright install chromium --with-deps', templateDir)) {
    console.log('Note: Browser installation may require additional system dependencies');
  }
  console.log()
  printSuccess('Playwright browsers');

  console.log('\nRunning: pnpm test:e2e (template)');
  if (!runCommand('pnpm test:e2e', templateDir)) {
    throw new Error('Playwright tests failed');
  }
  console.log()
  printSuccess('pnpm test:e2e (template)\n');

  // Staging scenario test
  printSection('STAGING SCENARIO TEST');

  const tmpDir = join(REPO_ROOT, '..', 'tmp-sunpeak-staging');
  const testProjectDir = join(tmpDir, 'test-app');

  console.log('Cleaning up old test directory...');
  if (!runCommand(`rm -rf ${tmpDir}`, REPO_ROOT)) {
    console.log('Note: No previous test directory to clean');
  }

  console.log('\nCreating temp directory...');
  if (!runCommand(`mkdir -p ${tmpDir}`, REPO_ROOT)) {
    throw new Error('Failed to create temp directory');
  }
  printSuccess('Created temp directory');

  console.log('\nRunning: sunpeak new test-app review');
  if (!runCommand(`node ${join(REPO_ROOT, 'bin', 'sunpeak.js')} new test-app review`, tmpDir)) {
    throw new Error('sunpeak new failed');
  }
  printSuccess('sunpeak new test-app review');

  console.log('\nLinking local sunpeak package...');
  const testPkgPath = join(testProjectDir, 'package.json');
  const testPkg = JSON.parse(readFileSync(testPkgPath, 'utf-8'));
  testPkg.dependencies.sunpeak = `file:${REPO_ROOT}`;
  writeFileSync(testPkgPath, JSON.stringify(testPkg, null, 2) + '\n');
  printSuccess('Linked local sunpeak package');

  console.log('\nRunning: pnpm install (test-app)');
  if (!runCommand('pnpm install', testProjectDir)) {
    throw new Error('pnpm install failed in test-app');
  }
  printSuccess('pnpm install (test-app)');

  console.log('\nRunning: pnpm build (test-app)');
  if (!runCommand('pnpm build', testProjectDir)) {
    throw new Error('pnpm build failed in test-app');
  }
  printSuccess('pnpm build (test-app)');

  console.log('\nRunning: Playwright test (test-app)');

  // Copy staging templates from tests/staging directory
  const stagingDir = join(REPO_ROOT, 'tests', 'staging');
  const testFileContent = readFileSync(join(stagingDir, 'staging-validation.spec.ts'), 'utf-8');
  const playwrightConfigContent = readFileSync(join(stagingDir, 'staging-playwright.config.ts'), 'utf-8');

  const testDir = join(testProjectDir, 'tests', 'e2e');
  if (!runCommand(`mkdir -p ${testDir}`, testProjectDir)) {
    throw new Error('Failed to create test directory');
  }
  writeFileSync(join(testDir, 'validation.spec.ts'), testFileContent);
  writeFileSync(join(testProjectDir, 'playwright.config.ts'), playwrightConfigContent);

  // Install playwright dependencies
  console.log('\nInstalling Playwright...');
  if (!runCommand('pnpm add -D @playwright/test', testProjectDir)) {
    throw new Error('Failed to install Playwright');
  }

  console.log('\nInstalling Playwright browsers...');
  if (!runCommand('pnpm exec playwright install chromium --with-deps', testProjectDir)) {
    console.log('Note: Browser installation may require additional system dependencies');
  }

  // Run the test
  if (!runCommand('pnpm exec playwright test', testProjectDir)) {
    throw new Error('Playwright test failed in test-app');
  }
  printSuccess('Playwright test (test-app)');

  console.log('\nCleaning up test directory...');
  if (!runCommand(`rm -rf ${tmpDir}`, REPO_ROOT)) {
    console.log('Note: Failed to clean up test directory, you may want to remove it manually');
  }
  printSuccess('Cleaned up test directory\n');

  printSuccess('SHIP IT!\n\n');
  process.exit(0);
} catch (error) {
  console.error(`\n${colors.red}Error: ${error.message}${colors.reset}\n`);
  process.exit(1);
}
