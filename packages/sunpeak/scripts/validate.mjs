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
import { existsSync, readFileSync, readdirSync, writeFileSync, rmSync, mkdirSync } from 'fs';
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
 * Verify dist CSS files don't contain unprocessed Tailwind/PostCSS directives
 * that consumers can't resolve (e.g. @import "tailwindcss", @source, @custom-variant).
 */
function validateDistCss() {
  console.log('Validating dist CSS files...');

  const forbiddenPatterns = [
    { regex: /@import\s+["']tailwindcss["']/, label: '@import "tailwindcss"' },
    { regex: /@source\s+/, label: '@source' },
    { regex: /@custom-variant\s+/, label: '@custom-variant' },
    { regex: /@utility\s+/, label: '@utility' },
  ];

  const cssFiles = ['dist/style.css', 'dist/chatgpt/globals.css'];
  const errors = [];

  for (const file of cssFiles) {
    const fullPath = join(PACKAGE_ROOT, file);
    if (!existsSync(fullPath)) continue;
    const content = readFileSync(fullPath, 'utf-8');
    for (const { regex, label } of forbiddenPatterns) {
      if (regex.test(content)) {
        errors.push(`  ${file} contains unprocessed ${label}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Dist CSS contains unprocessed directives:\n${errors.join('\n')}`);
  }

  printSuccess(`Dist CSS files verified (no unprocessed directives)`);
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

  // Find available ports for parallel execution.
  // Each parallel example gets its own preferred port range to minimize contention.
  const testPort = await getPort(6776 + index);
  const hmrPort = await getPort(24679 + index * 2);
  const sandboxPort = await getPort(24680 + index * 2);
  const env = {
    SUNPEAK_TEST_PORT: String(testPort),
    SUNPEAK_HMR_PORT: String(hmrPort),
    SUNPEAK_SANDBOX_PORT: String(sandboxPort),
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


/**
 * Inspect mode integration test.
 *
 * Starts `sunpeak start` (real MCP server) and `sunpeak inspect` pointing at it,
 * then verifies tool discovery, tool calling, and the inspect server health endpoint.
 * All ports are dynamically allocated via getPort() to support parallel runs.
 */
async function validateInspectMode(exampleDir) {
  const mcpPort = await getPort(18800);
  const inspectPort = await getPort(18900);
  const sandboxPort = await getPort(24690);

  // Start the MCP server
  console.log(`Starting MCP server on port ${mcpPort}...`);
  const mcpProcess = spawn('node', [SUNPEAK_BIN, 'start', '--port', String(mcpPort)], {
    cwd: exampleDir,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let mcpStdout = '';
  let mcpStderr = '';
  mcpProcess.stdout.on('data', (data) => { mcpStdout += data.toString(); });
  mcpProcess.stderr.on('data', (data) => { mcpStderr += data.toString(); });

  try {
    // Wait for MCP server to be ready
    let mcpReady = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500));
      try {
        const response = await fetch(`http://localhost:${mcpPort}/health`);
        if (response.ok) { mcpReady = true; break; }
      } catch { /* not up yet */ }
      if (mcpProcess.exitCode !== null) break;
    }

    if (!mcpReady) {
      throw new Error(`MCP server failed to start\nstdout: ${mcpStdout}\nstderr: ${mcpStderr}`);
    }
    printSuccess('MCP server started');

    // Start sunpeak inspect pointing at the MCP server
    console.log(`Starting inspect server on port ${inspectPort}...`);
    const inspectProcess = spawn(
      'node',
      [SUNPEAK_BIN, 'inspect', '--server', `http://localhost:${mcpPort}/mcp`, '--port', String(inspectPort)],
      {
        cwd: exampleDir,
        env: { ...process.env, CI: '1', SUNPEAK_SANDBOX_PORT: String(sandboxPort) },
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    let inspectStdout = '';
    let inspectStderr = '';
    inspectProcess.stdout.on('data', (data) => { inspectStdout += data.toString(); });
    inspectProcess.stderr.on('data', (data) => { inspectStderr += data.toString(); });

    try {
      // Wait for inspect server to be ready
      let inspectReady = false;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 500));
        try {
          const response = await fetch(`http://localhost:${inspectPort}/health`);
          if (response.ok) { inspectReady = true; break; }
        } catch { /* not up yet */ }
        if (inspectProcess.exitCode !== null) break;
      }

      if (!inspectReady) {
        if (inspectProcess.exitCode !== null) {
          throw new Error(`Inspect server exited with code ${inspectProcess.exitCode}\nstdout: ${inspectStdout}\nstderr: ${inspectStderr}`);
        }
        throw new Error(`Inspect server failed to start within 15s\nstdout: ${inspectStdout}\nstderr: ${inspectStderr}`);
      }
      printSuccess('Inspect server started');

      // Verify tool discovery
      const listToolsResp = await fetch(`http://localhost:${inspectPort}/__sunpeak/list-tools`);
      if (!listToolsResp.ok) throw new Error(`list-tools returned ${listToolsResp.status}`);
      const { tools } = await listToolsResp.json();
      if (!tools || tools.length === 0) throw new Error('No tools discovered from MCP server');
      const toolNames = tools.map(t => t.name);
      printSuccess(`Discovered ${tools.length} tool(s): ${toolNames.join(', ')}`);

      // Verify tool calling — pick the first tool and call it with empty args
      const firstTool = tools[0];
      const callToolResp = await fetch(`http://localhost:${inspectPort}/__sunpeak/call-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: firstTool.name, arguments: {} }),
      });
      if (!callToolResp.ok) throw new Error(`call-tool returned ${callToolResp.status}`);
      const callResult = await callToolResp.json();
      // Result should have either content or structuredContent (or isError)
      if (!callResult.content && !callResult.structuredContent && !callResult.isError) {
        throw new Error(`call-tool returned unexpected shape: ${JSON.stringify(callResult).substring(0, 200)}`);
      }
      printSuccess(`Tool call succeeded: ${firstTool.name}`);

      // Verify resource reading endpoint responds (even if no resources matched)
      const readResourceResp = await fetch(
        `http://localhost:${inspectPort}/__sunpeak/read-resource?uri=nonexistent://test`
      );
      // Should return 404 or 500 (resource not found), not crash
      if (readResourceResp.status !== 404 && readResourceResp.status !== 500) {
        throw new Error(`read-resource returned unexpected status ${readResourceResp.status}`);
      }
      printSuccess('Resource endpoint responds correctly');

      // Verify the inspect UI serves HTML
      const indexResp = await fetch(`http://localhost:${inspectPort}/`);
      if (!indexResp.ok) throw new Error(`Index page returned ${indexResp.status}`);
      const indexHtml = await indexResp.text();
      if (!indexHtml.includes('<div id="root">')) throw new Error('Index page missing #root');
      if (!indexHtml.includes('sunpeak')) throw new Error('Index page missing sunpeak branding');
      printSuccess('Inspect UI serves correctly');

    } finally {
      inspectProcess.kill('SIGTERM');
      await new Promise(r => setTimeout(r, 500));
      if (inspectProcess.exitCode === null) inspectProcess.kill('SIGKILL');
    }
  } finally {
    mcpProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 500));
    if (mcpProcess.exitCode === null) mcpProcess.kill('SIGKILL');
  }
}


/**
 * Dev server integration test.
 *
 * Boots `sunpeak dev` and exercises every interaction surface that could
 * break silently: MCP discovery, tool calling, resource HTML, simulation
 * fixture data, prod resources, backend-only tools, sandbox server, server
 * identity, and framework mode props.
 */
async function validateDevServer(projectDir) {
  const devPort = await getPort(18950);
  const sandboxPort = await getPort(24695);
  const hmrPort = await getPort(24696);

  console.log(`Starting dev server on port ${devPort}...`);
  const devProcess = spawn(
    'node',
    [SUNPEAK_BIN, 'dev', '--port', String(devPort), '--no-begging'],
    {
      cwd: projectDir,
      env: {
        ...process.env,
        CI: '1',
        PORT: String(devPort),
        SUNPEAK_SANDBOX_PORT: String(sandboxPort),
        SUNPEAK_HMR_PORT: String(hmrPort),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );

  let devStdout = '';
  let devStderr = '';
  devProcess.stdout.on('data', (data) => { devStdout += data.toString(); });
  devProcess.stderr.on('data', (data) => { devStderr += data.toString(); });

  try {
    // ── 1. Health endpoint ──
    let ready = false;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 500));
      try {
        const response = await fetch(`http://localhost:${devPort}/health`);
        if (response.ok) { ready = true; break; }
      } catch { /* not up yet */ }
      if (devProcess.exitCode !== null) break;
    }
    if (!ready) {
      const ctx = devProcess.exitCode !== null
        ? `exited with code ${devProcess.exitCode}`
        : 'failed to start within 30s';
      throw new Error(`Dev server ${ctx}\nstdout: ${devStdout}\nstderr: ${devStderr}`);
    }
    printSuccess('Dev server started');

    // ── 2. Tool discovery ──
    const listToolsResp = await fetch(`http://localhost:${devPort}/__sunpeak/list-tools`);
    if (!listToolsResp.ok) throw new Error(`list-tools returned ${listToolsResp.status}`);
    const { tools } = await listToolsResp.json();
    if (!tools || tools.length === 0) throw new Error('No tools discovered');
    const toolNames = tools.map(t => t.name);
    printSuccess(`Discovered ${tools.length} tool(s): ${toolNames.join(', ')}`);

    // ── 3. All expected simulations present ──
    // Read simulation directory to know what we expect
    const simDir = join(projectDir, 'tests/simulations');
    const expectedSims = readdirSync(simDir)
      .filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(readFileSync(join(simDir, f), 'utf-8')).tool);
    const missingTools = expectedSims.filter(name => !toolNames.includes(name));
    if (missingTools.length > 0) {
      throw new Error(`Tools from simulation files not discovered: ${missingTools.join(', ')}`);
    }
    printSuccess(`All ${expectedSims.length} simulation tools present`);

    // ── 4. UI tools have resource metadata ──
    const uiTools = tools.filter(t => t._meta?.ui?.resourceUri || t._meta?.['ui/resourceUri']);
    if (uiTools.length === 0) {
      throw new Error('Expected at least one UI tool with resourceUri metadata');
    }
    printSuccess(`${uiTools.length} UI tool(s) with resourceUri`);

    // ── 5. All UI resources have distinct URIs ──
    const resourceUris = uiTools.map(t => t._meta?.ui?.resourceUri ?? t._meta?.['ui/resourceUri']);
    const uniqueUris = new Set(resourceUris);
    // Multiple tools can share a resource (e.g., review-diff and review-post share review)
    // but every URI should be non-empty
    if (resourceUris.some(u => !u)) {
      throw new Error('Found UI tool with empty resourceUri');
    }
    printSuccess(`${uniqueUris.size} distinct resource URI(s)`);

    // ── 6. Backend-only tools registered and callable ──
    const backendTools = tools.filter(t => !t._meta?.ui?.resourceUri && !t._meta?.['ui/resourceUri']);
    if (backendTools.length === 0) {
      console.log('  (no backend-only tools found, skipping)');
    } else {
      const backendTool = backendTools[0];
      const backendResp = await fetch(`http://localhost:${devPort}/__sunpeak/call-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: backendTool.name, arguments: {} }),
      });
      if (!backendResp.ok) throw new Error(`Backend tool call returned ${backendResp.status}`);
      const backendResult = await backendResp.json();
      if (!backendResult.content && !backendResult.isError) {
        throw new Error(`Backend tool returned unexpected shape: ${JSON.stringify(backendResult).substring(0, 200)}`);
      }
      printSuccess(`Backend-only tool callable: ${backendTool.name}`);
    }

    // ── 7. UI tool calling returns structured content ──
    const uiToolWithResult = uiTools[0];
    const callResp = await fetch(`http://localhost:${devPort}/__sunpeak/call-tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: uiToolWithResult.name, arguments: {} }),
    });
    if (!callResp.ok) throw new Error(`call-tool returned ${callResp.status}`);
    const callResult = await callResp.json();
    if (!callResult.content && !callResult.structuredContent && !callResult.isError) {
      throw new Error(`UI tool call returned unexpected shape: ${JSON.stringify(callResult).substring(0, 200)}`);
    }
    printSuccess(`UI tool call succeeded: ${uiToolWithResult.name}`);

    // ── 8. Resource HTML served with Vite HMR ──
    const firstUri = uiTools[0]._meta?.ui?.resourceUri ?? uiTools[0]._meta?.['ui/resourceUri'];
    const readResp = await fetch(`http://localhost:${devPort}/__sunpeak/read-resource?uri=${encodeURIComponent(firstUri)}`);
    if (!readResp.ok) throw new Error(`read-resource returned ${readResp.status}`);
    const resourceHtml = await readResp.text();
    if (!resourceHtml.includes('<div id="root">')) throw new Error('Resource HTML missing #root');
    if (!resourceHtml.includes('@vite/client')) throw new Error('Resource HTML missing Vite HMR script');
    printSuccess('Resource HTML served with Vite HMR');

    // ── 9. All distinct resources readable ──
    for (const uri of uniqueUris) {
      const resp = await fetch(`http://localhost:${devPort}/__sunpeak/read-resource?uri=${encodeURIComponent(uri)}`);
      if (!resp.ok) throw new Error(`read-resource failed for ${uri}: ${resp.status}`);
      const html = await resp.text();
      if (!html.includes('<div id="root">')) throw new Error(`Resource ${uri} missing #root`);
    }
    printSuccess(`All ${uniqueUris.size} resources readable`);

    // ── 10. Simulator UI: framework mode (no server URL input) ──
    const indexResp = await fetch(`http://localhost:${devPort}/`);
    if (!indexResp.ok) throw new Error(`Index page returned ${indexResp.status}`);
    const indexHtml = await indexResp.text();
    if (!indexHtml.includes('<div id="root">')) throw new Error('Index page missing #root');
    // In framework mode, the virtual entry should NOT set mcpServerUrl (which shows
    // the server URL input). It should contain the simulations and onCallTool instead.
    if (indexHtml.includes('mcpServerUrl')) {
      throw new Error('Framework mode: index page should not contain mcpServerUrl');
    }
    printSuccess('Simulator UI in framework mode');

    // ── 11. Server identity in page title ──
    // The dev server reads name from server.ts or package.json. The template's
    // package.json name is "sunpeak-app". It should appear in the <title>.
    const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf-8'));
    const expectedName = pkg.name || 'sunpeak-app';
    if (!indexHtml.includes(expectedName)) {
      throw new Error(`Page title should contain "${expectedName}"`);
    }
    printSuccess(`Server identity in title: "${expectedName}"`);

    // ── 12. Simulation fixture data flows through ──
    // Fixture data (toolInput, toolResult, serverTools, userMessage) from JSON
    // files is merged into the simulations object and serialized into the virtual
    // entry JS module. Fetch the module and check for fixture data.
    const entryResp = await fetch(`http://localhost:${devPort}/@id/__x00__virtual:sunpeak-inspect-entry`);
    if (!entryResp.ok) throw new Error(`Virtual entry module returned ${entryResp.status}`);
    const entryJs = await entryResp.text();

    const sampleFixture = JSON.parse(readFileSync(join(simDir, 'show-albums.json'), 'utf-8'));
    if (sampleFixture.toolInput) {
      const fixtureKey = Object.keys(sampleFixture.toolInput)[0]; // e.g., "category"
      if (!entryJs.includes(fixtureKey)) {
        throw new Error(`Fixture toolInput missing from virtual entry (expected "${fixtureKey}")`);
      }
      printSuccess('Fixture data: toolInput flows through');
    }
    if (sampleFixture.userMessage) {
      if (!entryJs.includes(sampleFixture.userMessage.substring(0, 20))) {
        throw new Error(`Fixture userMessage missing from virtual entry`);
      }
      printSuccess('Fixture data: userMessage flows through');
    }
    if (sampleFixture.toolResult?.structuredContent) {
      // Verify the entry contains the structured content shape
      if (!entryJs.includes('structuredContent')) {
        throw new Error('Fixture toolResult.structuredContent missing from virtual entry');
      }
      printSuccess('Fixture data: toolResult flows through');
    }

    // ── 13. Sandbox server responds ──
    // The sandbox URL is embedded in the virtual entry module JS.
    // Extract it and verify the sandbox proxy is reachable.
    const sandboxUrlMatch = entryJs.match(/const sandboxUrl\s*=\s*"(http[^"]+)"/);
    if (!sandboxUrlMatch) {
      throw new Error('Sandbox URL not found in virtual entry module');
    }
    const sandboxUrl = sandboxUrlMatch[1];
    // The sandbox serves the proxy at /proxy and has a /health endpoint
    const sandboxHealthResp = await fetch(`${sandboxUrl}/health`);
    if (!sandboxHealthResp.ok) throw new Error(`Sandbox health returned ${sandboxHealthResp.status}`);
    const sandboxProxyResp = await fetch(`${sandboxUrl}/proxy`);
    if (!sandboxProxyResp.ok) throw new Error(`Sandbox proxy returned ${sandboxProxyResp.status}`);
    const sandboxHtml = await sandboxProxyResp.text();
    if (!sandboxHtml.includes('postMessage')) {
      throw new Error('Sandbox proxy HTML missing PostMessage relay');
    }
    if (!sandboxHtml.includes('sandbox-proxy-ready')) {
      throw new Error('Sandbox proxy HTML missing readiness signal');
    }
    printSuccess(`Sandbox server responds (${sandboxUrl})`);

    // ── 14. Prod resources: /dist/ served after build ──
    let buildDone = false;
    for (let i = 0; i < 60; i++) {
      if ((devStdout + devStderr).includes('Built resources for the MCP server')) {
        buildDone = true;
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    if (!buildDone) {
      throw new Error('Build watcher did not complete within 30s');
    }

    // Extract resource name from URI (ui://name-timestamp → name)
    const resourceName = firstUri.replace('ui://', '').replace(/-[a-z0-9]+$/, '');
    const distUrl = `http://localhost:${devPort}/dist/${resourceName}/${resourceName}.html`;

    // HEAD (the Simulator polls with HEAD to check readiness)
    const distHeadResp = await fetch(distUrl, { method: 'HEAD' });
    if (!distHeadResp.ok) {
      throw new Error(`Prod resources HEAD ${distUrl} returned ${distHeadResp.status}`);
    }

    // GET (the Simulator loads this in the iframe)
    const distGetResp = await fetch(distUrl);
    const distHtml = await distGetResp.text();
    if (!distHtml.includes('<div id="root">')) throw new Error('Prod resources HTML missing #root');
    if (!distHtml.includes('<script>')) throw new Error('Prod resources HTML missing inlined script');
    // Prod HTML should NOT contain Vite HMR (it's self-contained)
    if (distHtml.includes('@vite/client')) throw new Error('Prod resources HTML should not contain Vite HMR');
    printSuccess(`Prod resources served: /dist/${resourceName}/${resourceName}.html`);

    // ── 15. Missing dist file returns 404 (not SPA fallback) ──
    const missingDistResp = await fetch(`http://localhost:${devPort}/dist/nonexistent/nonexistent.html`, { method: 'HEAD' });
    if (missingDistResp.ok) {
      throw new Error('Missing dist file should return 404, not 200');
    }
    printSuccess('Missing dist file returns 404');

  } finally {
    devProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 1000));
    if (devProcess.exitCode === null) devProcess.kill('SIGKILL');
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
  validateDistCss();

  console.log('\nRunning: pnpm typecheck');
  if (!runCommand('pnpm typecheck', PACKAGE_ROOT)) throw new Error('pnpm typecheck failed');
  printSuccess('pnpm typecheck');

  console.log('\nRunning: template typecheck');
  if (!runCommand('pnpm exec tsc --noEmit', TEMPLATE_ROOT)) throw new Error('Template typecheck failed');
  printSuccess('template typecheck');

  console.log('\nRunning: pnpm test');
  if (!runCommand('pnpm test', PACKAGE_ROOT)) throw new Error('pnpm test failed');
  printSuccess('pnpm test');

  console.log('\nInstalling Playwright browsers for package-level e2e...');
  if (!runCommand('pnpm exec playwright install chromium --with-deps', PACKAGE_ROOT)) {
    throw new Error('Playwright browser install failed');
  }
  printSuccess('Playwright browsers installed');

  console.log('\nRunning: pnpm test:e2e (package-level simulator e2e)');
  if (!runCommand('pnpm test:e2e', PACKAGE_ROOT)) throw new Error('pnpm test:e2e failed');
  printSuccess('pnpm test:e2e');

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
  // Phase 5b: Inspect mode integration test
  // ==========================================================================
  printSection('INSPECT MODE');

  // Use the template directory (already built during pnpm build) rather than an
  // example, because examples may lack esbuild and skip tool compilation.
  console.log('Building template for inspect test...');
  if (!runCommand(`node ${SUNPEAK_BIN} build`, TEMPLATE_ROOT)) {
    throw new Error('Template build failed for inspect test');
  }
  printSuccess('Template built');
  await validateInspectMode(TEMPLATE_ROOT);

  // ==========================================================================
  // Phase 5c: Dev server integration test
  // ==========================================================================
  printSection('DEV SERVER');

  await validateDevServer(TEMPLATE_ROOT);

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
