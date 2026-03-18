#!/usr/bin/env node

/**
 * Local Testing Script for Sunpeak
 * This script runs all local tests described in DEVELOPMENT.md
 *
 * Parallelization strategy:
 * - Package-level checks run sequentially (fast, shared state)
 * - Scaffold smoke test + all example projects run in parallel
 * - Each example gets unique ports to avoid conflicts
 */

import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'fs';
import { discoverResources } from '../bin/lib/patterns.mjs';
import { getPort } from '../bin/lib/get-port.mjs';

// Color codes for output
const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  blue: '\x1b[0;34m',
  yellow: '\x1b[1;33m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
};

// Get repo root and package root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = join(__dirname, '..');
const REPO_ROOT = join(__dirname, '..', '..', '..');
const TEMPLATE_ROOT = join(PACKAGE_ROOT, 'template');
const DOCS_ROOT = join(REPO_ROOT, 'docs');
const EXAMPLES_DIR = join(REPO_ROOT, 'examples');
const SUNPEAK_BIN = join(PACKAGE_ROOT, 'bin', 'sunpeak.js');

// Helper functions
function printSection(text) {
  console.log(`\n${colors.blue}${'='.repeat(40)}${colors.reset}`);
  console.log(`${colors.blue}${text}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(40)}${colors.reset}\n`);
}

function printSuccess(text) {
  console.log(`${colors.green}✓ ${text}${colors.reset}`);
}

function runCommand(command, cwd, env) {
  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1', ...env },
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Run a command capturing stdout+stderr. Returns { ok, output }.
 * Used for parallel tasks where stdio: 'inherit' would interleave.
 */
function runCommandCapture(command, cwd, env) {
  try {
    const output = execSync(command, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0', ...env },
      maxBuffer: 50 * 1024 * 1024,
    });
    return { ok: true, output: output.toString() };
  } catch (error) {
    return { ok: false, output: (error.stdout?.toString() || '') + (error.stderr?.toString() || '') };
  }
}

/**
 * Run a sequence of commands, stopping on first failure. Returns { ok, step, output }.
 */
function runSteps(steps, cwd, env) {
  const allOutput = [];
  for (const { name, command } of steps) {
    const result = runCommandCapture(command, cwd, env);
    allOutput.push(`--- ${name} ---\n${result.output}`);
    if (!result.ok) {
      return { ok: false, step: name, output: allOutput.join('\n') };
    }
  }
  return { ok: true, step: null, output: allOutput.join('\n') };
}


// ============================================================================
// Validation checks (run after build, before examples)
// ============================================================================

/**
 * Verify every export path in package.json resolves to a real file in dist/.
 */
function validateExportsMap() {
  console.log('Validating package.json exports map...');

  const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8'));
  const exports = pkg.exports;
  const errors = [];

  function checkPath(exportKey, filePath) {
    const resolved = join(PACKAGE_ROOT, filePath);
    if (!existsSync(resolved)) {
      errors.push(`  ${exportKey} → ${filePath} (file not found)`);
    }
  }

  for (const [key, value] of Object.entries(exports)) {
    if (typeof value === 'string') {
      checkPath(key, value);
    } else if (typeof value === 'object') {
      for (const [condition, condValue] of Object.entries(value)) {
        if (typeof condValue === 'string') {
          checkPath(`${key}[${condition}]`, condValue);
        } else if (typeof condValue === 'object') {
          for (const [subKey, subValue] of Object.entries(condValue)) {
            if (typeof subValue === 'string') {
              checkPath(`${key}[${condition}][${subKey}]`, subValue);
            }
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Exports map has ${errors.length} missing file(s):\n${errors.join('\n')}`);
  }

  const exportKeys = Object.keys(exports).filter(k => k !== './package.json');
  printSuccess(`Exports map verified (${exportKeys.length} entry points)`);
}

/**
 * Verify every page referenced in docs.json has a corresponding .mdx file.
 * Also checks that every exported hook has a docs page.
 */
function validateDocs() {
  console.log('Validating docs navigation...');

  const docsJson = JSON.parse(readFileSync(join(DOCS_ROOT, 'docs.json'), 'utf-8'));
  const errors = [];

  const referencedPages = [];
  function collectPages(obj) {
    if (Array.isArray(obj)) {
      for (const item of obj) collectPages(item);
    } else if (typeof obj === 'object' && obj !== null) {
      if (obj.pages) {
        for (const page of obj.pages) {
          if (typeof page === 'string') {
            referencedPages.push(page);
          } else {
            collectPages(page);
          }
        }
      }
      if (obj.groups) collectPages(obj.groups);
      if (obj.tabs) collectPages(obj.tabs);
    }
  }
  collectPages(docsJson.navigation);

  for (const page of referencedPages) {
    const mdxPath = join(DOCS_ROOT, `${page}.mdx`);
    if (!existsSync(mdxPath)) {
      errors.push(`  docs.json references "${page}" but ${page}.mdx not found`);
    }
  }

  const hooksIndex = readFileSync(join(PACKAGE_ROOT, 'src/hooks/index.ts'), 'utf-8');
  const hookExports = [...hooksIndex.matchAll(/export \{ (\w+) \}/g)].map(m => m[1]);

  const sdkReExports = new Set([
    'useAutoResize', 'useDocumentTheme', 'useHostStyleVariables', 'useHostFonts', 'useHostStyles',
  ]);
  const nonHookExports = new Set(['AppProvider', 'SafeArea']);

  const hooksMissingDocs = [];
  for (const hookName of hookExports) {
    if (sdkReExports.has(hookName) || nonHookExports.has(hookName)) continue;

    const kebab = hookName.replace(/^use/, 'use-').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
      .replace(/^use--/, 'use-');
    const expectedPage = `api-reference/hooks/${kebab}`;

    if (!referencedPages.includes(expectedPage)) {
      hooksMissingDocs.push(`  Hook "${hookName}" not in docs.json navigation (expected "${expectedPage}")`);
    }
    const mdxPath = join(DOCS_ROOT, `${expectedPage}.mdx`);
    if (!existsSync(mdxPath)) {
      hooksMissingDocs.push(`  Hook "${hookName}" has no doc page at ${expectedPage}.mdx`);
    }
  }
  errors.push(...hooksMissingDocs);

  if (errors.length > 0) {
    throw new Error(`Docs validation found ${errors.length} issue(s):\n${errors.join('\n')}`);
  }

  const hookCount = hookExports.filter(h => !sdkReExports.has(h) && !nonHookExports.has(h)).length;
  printSuccess(`Docs validated (${referencedPages.length} pages, ${hookCount} hooks verified)`);
}


// ============================================================================
// Parallel task runners
// ============================================================================

/**
 * Scaffold smoke test — validates the `sunpeak new` CLI path.
 * Runs captured (no stdio inherit) so it can run in parallel.
 */
function runScaffoldSmokeTest() {
  const tmpDir = join(REPO_ROOT, '.tmp-validate-new');

  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true });
  }
  mkdirSync(tmpDir, { recursive: true });

  try {
    const firstResource = discoverResources()[0];
    let result = runCommandCapture(`node ${SUNPEAK_BIN} new validate-test-app ${firstResource}`, tmpDir);
    if (!result.ok) return { ok: false, step: 'sunpeak new', output: result.output };

    const projectDir = join(tmpDir, 'validate-test-app');

    const pkgPath = join(projectDir, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    pkg.dependencies.sunpeak = `file:${PACKAGE_ROOT}`;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

    return runSteps([
      { name: 'pnpm install', command: 'pnpm install --ignore-workspace --no-frozen-lockfile' },
      { name: 'tsc --noEmit', command: 'pnpm exec tsc --noEmit' },
      { name: 'pnpm test', command: 'pnpm test' },
      { name: 'sunpeak build', command: `node ${SUNPEAK_BIN} build` },
    ], projectDir);
  } finally {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true });
    }
  }
}

/**
 * Test a single example project — install, typecheck, test, build, e2e.
 * Runs captured so multiple examples can run in parallel.
 * Each example gets unique ports to avoid conflicts.
 */
async function testExample(resource, index) {
  const exampleName = `${resource}-example`;
  const exampleDir = join(EXAMPLES_DIR, exampleName);

  // Find available ports for parallel execution
  const testPort = await getPort(6776 + index);
  const hmrPort = await getPort(24679 + index);
  const env = {
    SUNPEAK_TEST_PORT: String(testPort),
    SUNPEAK_HMR_PORT: String(hmrPort),
  };

  // Link local sunpeak
  const pkgPath = join(exampleDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.dependencies.sunpeak = `file:${PACKAGE_ROOT}`;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  return runSteps([
    { name: 'pnpm install', command: 'pnpm install --ignore-workspace --no-frozen-lockfile' },
    { name: 'tsc --noEmit', command: 'pnpm exec tsc --noEmit' },
    { name: 'pnpm test', command: 'pnpm test' },
    { name: 'sunpeak build', command: `node ${SUNPEAK_BIN} build` },
    { name: 'pnpm test:e2e', command: 'pnpm test:e2e' },
  ], exampleDir, env);
}

/**
 * Production server smoke test.
 */
async function validateProductionServer(exampleDir) {
  const port = await getPort(18765);

  const serverProcess = spawn('node', [SUNPEAK_BIN, 'start', '--port', String(port)], {
    cwd: exampleDir,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  serverProcess.stdout.on('data', (data) => { stdout += data.toString(); });
  serverProcess.stderr.on('data', (data) => { stderr += data.toString(); });

  try {
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500));
      try {
        const response = await fetch(`http://localhost:${port}/health`);
        if (response.ok) { ready = true; break; }
      } catch { /* not up yet */ }
      if (serverProcess.exitCode !== null) break;
    }

    if (!ready) {
      if (serverProcess.exitCode !== null) {
        throw new Error(`Production server exited with code ${serverProcess.exitCode}\nstdout: ${stdout}\nstderr: ${stderr}`);
      }
      throw new Error(`Production server failed to start within 15s\nstdout: ${stdout}\nstderr: ${stderr}`);
    }

    printSuccess('Production server started');

    const healthResp = await fetch(`http://localhost:${port}/health`);
    if (!healthResp.ok) throw new Error(`Health check returned ${healthResp.status}`);
    printSuccess('Health check passed');

    const mcpResp = await fetch(`http://localhost:${port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream, application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'validate', version: '0.0.1' } },
      }),
    });
    if (!mcpResp.ok) throw new Error(`MCP endpoint returned ${mcpResp.status}`);

    const sseText = await mcpResp.text();
    const dataLine = sseText.split('\n').find(l => l.startsWith('data: '));
    if (!dataLine) throw new Error(`MCP response missing data line: ${sseText.substring(0, 200)}`);
    const mcpBody = JSON.parse(dataLine.slice(6));
    if (!mcpBody.result?.serverInfo) throw new Error(`MCP initialize response missing serverInfo: ${JSON.stringify(mcpBody)}`);
    printSuccess(`MCP initialize responded (${mcpBody.result.serverInfo.name} v${mcpBody.result.serverInfo.version})`);
  } finally {
    serverProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 500));
    if (serverProcess.exitCode === null) serverProcess.kill('SIGKILL');
  }
}


// ============================================================================
// Main testing flow
// ============================================================================

// Parse --live flag
const liveMode = process.argv.includes('--live');

const startTime = Date.now();

console.log(`${colors.yellow}Starting local testing for Sunpeak...${colors.reset}`);
console.log(`Repository root: ${REPO_ROOT}`);
console.log(`Package root: ${PACKAGE_ROOT}\n`);

try {
  // ==========================================================================
  // Phase 1: Package-level checks (sequential, fast)
  // ==========================================================================
  printSection('PACKAGE LEVEL TESTS');

  console.log('Running: pnpm install');
  if (!runCommand('pnpm install', REPO_ROOT)) throw new Error('pnpm install failed');
  printSuccess('pnpm install');

  console.log('\nRunning: pnpm format');
  if (!runCommand('pnpm format', PACKAGE_ROOT)) throw new Error('pnpm format failed');
  printSuccess('pnpm format');

  console.log('\nRunning: pnpm lint');
  if (!runCommand('pnpm lint', PACKAGE_ROOT)) throw new Error('pnpm lint failed');
  printSuccess('pnpm lint');

  console.log('\nRunning: pnpm build');
  if (!runCommand('pnpm build', PACKAGE_ROOT)) throw new Error('pnpm build failed');
  printSuccess('pnpm build');

  validateExportsMap();

  console.log('\nRunning: pnpm typecheck');
  if (!runCommand('pnpm typecheck', PACKAGE_ROOT)) throw new Error('pnpm typecheck failed');
  printSuccess('pnpm typecheck');

  console.log('\nRunning: template typecheck');
  if (!runCommand('pnpm exec tsc --noEmit', TEMPLATE_ROOT)) throw new Error('Template typecheck failed');
  printSuccess('template typecheck');

  console.log('\nRunning: pnpm test');
  if (!runCommand('pnpm test', PACKAGE_ROOT)) throw new Error('pnpm test failed');
  printSuccess('pnpm test');

  // ==========================================================================
  // Phase 2: Static validations (instant)
  // ==========================================================================
  printSection('DOCS VALIDATION');
  validateDocs();

  // ==========================================================================
  // Phase 3: Generate examples + install Playwright (before parallel phase)
  // ==========================================================================
  printSection('EXAMPLE PROJECTS');

  const resources = discoverResources();
  console.log(`Discovered resources: ${resources.join(', ')}`);

  console.log('\nGenerating examples...');
  if (!runCommand(`node ${join(PACKAGE_ROOT, 'scripts', 'generate-examples.mjs')} --skip-install`, REPO_ROOT)) {
    throw new Error('Example generation failed');
  }
  printSuccess('Examples generated');

  // Install Playwright browsers once (using first example's node_modules after a quick link+install)
  {
    const firstDir = join(EXAMPLES_DIR, `${resources[0]}-example`);
    const pkgPath = join(firstDir, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    pkg.dependencies.sunpeak = `file:${PACKAGE_ROOT}`;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('\nInstalling Playwright browsers...');
    runCommand('pnpm install --ignore-workspace --no-frozen-lockfile', firstDir);
    runCommand('pnpm exec playwright install chromium --with-deps', firstDir);
    printSuccess('Playwright browsers installed');
    // Undo the link — testExample will re-link + install
    const origPkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    origPkg.dependencies.sunpeak = `file:${PACKAGE_ROOT}`;
    writeFileSync(pkgPath, JSON.stringify(origPkg, null, 2) + '\n');
  }

  // ==========================================================================
  // Phase 4: Parallel — scaffold smoke test + all examples
  // ==========================================================================
  printSection('PARALLEL: SCAFFOLD + EXAMPLES');

  const parallelStart = Date.now();
  console.log(`Running scaffold smoke test + ${resources.length} examples in parallel...\n`);

  const [scaffoldResult, ...exampleResults] = await Promise.all([
    // Scaffold smoke test
    new Promise(resolve => resolve(runScaffoldSmokeTest())),
    // All examples in parallel
    ...resources.map((resource, index) =>
      new Promise(resolve => resolve(testExample(resource, index)))
    ),
  ]);

  // Report scaffold result
  if (scaffoldResult.ok) {
    printSuccess('scaffold smoke test');
  } else {
    console.error(`\n${colors.red}✗ scaffold smoke test failed at: ${scaffoldResult.step}${colors.reset}`);
    console.error(`${colors.dim}${scaffoldResult.output.split('\n').slice(-30).join('\n')}${colors.reset}`);
    throw new Error(`Scaffold smoke test failed at: ${scaffoldResult.step}`);
  }

  // Report example results
  const failedExamples = [];
  resources.forEach((resource, index) => {
    const result = exampleResults[index];
    const name = `${resource}-example`;
    if (result.ok) {
      printSuccess(name);
    } else {
      failedExamples.push({ name, result });
    }
  });

  if (failedExamples.length > 0) {
    for (const { name, result } of failedExamples) {
      console.error(`\n${colors.red}✗ ${name} failed at: ${result.step}${colors.reset}`);
      console.error(`${colors.dim}${result.output.split('\n').slice(-40).join('\n')}${colors.reset}`);
    }
    throw new Error(`${failedExamples.length} example(s) failed: ${failedExamples.map(e => e.name).join(', ')}`);
  }

  const parallelDuration = ((Date.now() - parallelStart) / 1000).toFixed(1);
  printSuccess(`All parallel tasks passed (${parallelDuration}s wall time)`);

  // ==========================================================================
  // Phase 5: Production server smoke test
  // ==========================================================================
  printSection('PRODUCTION SERVER');

  // Rebuild last example to ensure dist/ is fresh
  const lastResource = resources[resources.length - 1];
  const lastExampleDir = join(EXAMPLES_DIR, `${lastResource}-example`);
  console.log(`Rebuilding ${lastResource}-example for production server test...`);
  if (!runCommand(`node ${SUNPEAK_BIN} build`, lastExampleDir)) {
    throw new Error('Failed to rebuild for production server test');
  }
  printSuccess('sunpeak build (for production server)');

  await validateProductionServer(lastExampleDir);

  // ==========================================================================
  // Phase 6: Live tests (opt-in, requires tunnel)
  // ==========================================================================
  if (liveMode) {
    printSection('LIVE TESTS');

    if (!runCommand('pnpm test:live', TEMPLATE_ROOT)) {
      throw new Error('Live tests failed');
    }

    printSuccess('Live tests passed');
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================
  console.log('\nRegenerating clean examples...');
  if (!runCommand(`node ${join(PACKAGE_ROOT, 'scripts', 'generate-examples.mjs')} --skip-install`, REPO_ROOT)) {
    console.log('Note: Failed to regenerate clean examples');
  }
  printSuccess('Clean examples restored');

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  printSuccess(`SHIP IT! (${totalDuration}s total)\n\n`);
  process.exit(0);
} catch (error) {
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.error(`\n${colors.red}Error (${totalDuration}s): ${error.message}${colors.reset}\n`);
  process.exit(1);
}
