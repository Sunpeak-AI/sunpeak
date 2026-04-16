import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * sunpeak test — Run MCP server tests.
 *
 * No flags:                    Run unit + e2e tests
 * sunpeak test init            Scaffold test infrastructure
 * sunpeak test --unit          Run unit tests (vitest)
 * sunpeak test --e2e           Run e2e tests (Playwright)
 * sunpeak test --live          Run live tests against real hosts
 * sunpeak test --eval          Run evals against LLM models
 * sunpeak test --visual        Run e2e tests with visual regression comparison
 * sunpeak test --visual --update  Update visual regression baselines
 * sunpeak test [pattern]       Pass through to the relevant runner
 *
 * Flags are additive: --unit --e2e --live --eval runs all four.
 * --visual implies --e2e and enables screenshot comparison.
 * --update implies --visual.
 * --eval and --live are never included in the default run (they cost money).
 */
export async function runTest(args) {
  // Handle `sunpeak test init` subcommand
  if (args[0] === 'init') {
    const { testInit } = await import('./test-init.mjs');
    await testInit(args.slice(1));
    return;
  }

  const isUnit = args.includes('--unit');
  const isE2e = args.includes('--e2e');
  const isLive = args.includes('--live');
  const isEval = args.includes('--eval');
  let isVisual = args.includes('--visual');
  const isUpdate = args.includes('--update');
  const filteredArgs = args.filter(
    (a) => !['--unit', '--e2e', '--live', '--eval', '--visual', '--update'].includes(a)
  );

  // --update implies --visual (no point updating without enabling visual)
  if (isUpdate) isVisual = true;

  const hasAnyScope = isUnit || isE2e || isLive || isEval || isVisual;

  // When extra args are present (file patterns, etc.) and no scope flags given,
  // default to e2e only — passing Playwright file patterns to vitest would fail.
  const hasExtraArgs = filteredArgs.length > 0;

  // Determine which suites to run.
  // No scope flags → unit + e2e (unless extra args narrow to e2e).
  // --visual implies e2e.
  // --eval and --live are never in the default run (they cost money).
  const runUnit = hasAnyScope ? isUnit : !hasExtraArgs;
  const runE2e = hasAnyScope ? (isE2e || isVisual) : true;
  const runLive = isLive;
  const runEval = isEval;

  const results = [];

  if (runUnit) {
    // Only run unit tests if vitest is available (app framework projects have it,
    // standalone testing framework projects don't).
    const hasVitest = existsSync(join(process.cwd(), 'node_modules', '.bin', 'vitest'));
    if (hasVitest) {
      const code = await runChild('pnpm', ['exec', 'vitest', 'run', ...filteredArgs]);
      results.push({ suite: 'unit', code });
    } else if (isUnit) {
      // Only warn if the user explicitly asked for --unit
      console.error('vitest is not installed. Install it with: npm add -D vitest');
      results.push({ suite: 'unit', code: 1 });
    }
  }

  if (runE2e) {
    const code = await runPlaywright(filteredArgs, {
      configCandidates: [
        'playwright.config.ts',
        'playwright.config.js',
        'sunpeak.config.ts',
        'sunpeak.config.js',
        // Fallback for non-JS projects: tests/sunpeak/ self-contained directory
        'tests/sunpeak/playwright.config.ts',
        'tests/sunpeak/playwright.config.js',
      ],
      visual: isVisual,
      updateSnapshots: isVisual && isUpdate,
    });
    results.push({ suite: 'e2e', code });
  }

  if (runLive) {
    const code = await runPlaywright(filteredArgs, {
      configCandidates: [
        'tests/live/playwright.config.ts',
        'tests/live/playwright.config.js',
        // Non-JS projects: tests/sunpeak/ self-contained directory (run from project root)
        'tests/sunpeak/live/playwright.config.ts',
        'tests/sunpeak/live/playwright.config.js',
        // Non-JS projects: run from within tests/sunpeak/ directly
        'live/playwright.config.ts',
        'live/playwright.config.js',
      ],
      configRequired: true,
      configErrorMessage: 'No live test config found. Expected at tests/live/playwright.config.ts or live/playwright.config.ts',
    });
    results.push({ suite: 'live', code });
  }

  if (runEval) {
    const code = await runEvals(filteredArgs);
    results.push({ suite: 'eval', code });
  }

  // Exit with the first non-zero code, or 0 if all passed
  const failed = results.find((r) => r.code !== 0);
  process.exit(failed ? failed.code : 0);
}

/**
 * Spawn a child process and return its exit code.
 */
function runChild(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    child.on('error', () => resolve(1));
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

/**
 * Run Playwright and return the exit code.
 */
function runPlaywright(args, options = {}) {
  const {
    configCandidates = [],
    configRequired = false,
    configErrorMessage,
    visual = false,
    updateSnapshots = false,
  } = options;

  const config = findConfig(configCandidates);

  if (!config && configRequired) {
    console.error(configErrorMessage);
    return Promise.resolve(1);
  }

  const configArgs = config ? ['--config', config] : [];
  const extraArgs = updateSnapshots ? ['--update-snapshots'] : [];

  return runChild(
    'pnpm',
    ['exec', 'playwright', 'test', ...configArgs, ...extraArgs, ...args],
    {
      SUNPEAK_DEV_OVERLAY: process.env.SUNPEAK_DEV_OVERLAY ?? 'false',
      ...(visual ? { SUNPEAK_VISUAL: 'true' } : {}),
    }
  );
}

function findConfig(candidates) {
  for (const candidate of candidates) {
    const full = join(process.cwd(), candidate);
    if (existsSync(full)) return candidate;
  }
  return null;
}

/**
 * Detect if the current directory is a sunpeak app project (has tools to serve).
 * Just having sunpeak as a dependency is not enough — the testing framework
 * can be used with any MCP server. A sunpeak app project has src/tools/.
 */
function isSunpeakProject() {
  const pkgPath = join(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (!('sunpeak' in deps)) return false;
    // Check for the sunpeak app convention (src/tools/ directory)
    return existsSync(join(process.cwd(), 'src', 'tools'));
  } catch {
    return false;
  }
}

/**
 * Start the dev server and wait for it to be ready.
 * The dev server's inspector listens on inspectorPort (default 3000)
 * and the MCP server listens on mcpPort (default 8000).
 * @param {{ inspectorPort: number, mcpPort: number }} ports
 * @returns {Promise<{ process: import('child_process').ChildProcess } | null>}
 */
async function startDevServer({ inspectorPort, mcpPort }) {
  // Check if the MCP server is already running
  try {
    const resp = await fetch(`http://localhost:${mcpPort}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (resp.ok) return null; // Server already running
  } catch {
    // Not running, start it
  }

  console.log('Starting dev server for evals...');
  const child = spawn(
    'pnpm',
    ['exec', 'sunpeak', 'dev', '--', '--prod-tools'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PORT: String(inspectorPort),
        SUNPEAK_MCP_PORT: String(mcpPort),
        SUNPEAK_DEV_OVERLAY: 'false',
      },
    }
  );

  // Detect early exit (build errors, port conflicts, etc.)
  let exited = false;
  let stderrChunks = [];
  child.stderr.on('data', (chunk) => stderrChunks.push(chunk.toString()));
  child.on('exit', () => { exited = true; });

  // Wait for the inspector health endpoint
  const timeout = 60_000;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (exited) {
      const stderr = stderrChunks.join('');
      throw new Error(`Dev server exited before becoming ready.\n${stderr}`);
    }
    try {
      const resp = await fetch(`http://localhost:${inspectorPort}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (resp.ok) {
        // Also verify the MCP server is reachable
        try {
          await fetch(`http://localhost:${mcpPort}/health`, {
            signal: AbortSignal.timeout(2000),
          });
        } catch {
          // MCP server not ready yet, keep polling
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        console.log('Dev server ready');
        return { process: child };
      }
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  child.kill();
  throw new Error(`Dev server did not start within ${timeout / 1000}s`);
}

/**
 * Load .env file from a directory into process.env (only sets vars not already set).
 * @param {string} dir - Directory containing .env file
 */
function loadEnvFile(dir) {
  const envPath = join(dir, '.env');
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    value = value.replace(/^(['"])(.*)\1$/, '$2');
    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

/**
 * Map of provider packages to their required env vars.
 */
const PROVIDER_ENV_VARS = {
  '@ai-sdk/openai': 'OPENAI_API_KEY',
  '@ai-sdk/anthropic': 'ANTHROPIC_API_KEY',
  '@ai-sdk/google': 'GOOGLE_GENERATIVE_AI_API_KEY',
};

/**
 * Map model ID prefix to provider package.
 */
function getProviderForModel(modelId) {
  if (/^(gpt-|o[134]-|o[134]$|chatgpt-)/.test(modelId)) return '@ai-sdk/openai';
  if (/^claude-/.test(modelId)) return '@ai-sdk/anthropic';
  if (/^(gemini-|models\/gemini-)/.test(modelId)) return '@ai-sdk/google';
  return null;
}

/**
 * Validate that required API keys are set for the configured models.
 * @param {string[]} models
 * @returns {string[]} Array of warning messages (empty if all good)
 */
function validateApiKeys(models) {
  const warnings = [];
  const checked = new Set();
  for (const modelId of models) {
    const pkg = getProviderForModel(modelId);
    if (!pkg || checked.has(pkg)) continue;
    checked.add(pkg);
    const envVar = PROVIDER_ENV_VARS[pkg];
    if (envVar && !process.env[envVar]) {
      warnings.push(`${envVar} not set (required for ${modelId}). Add it to tests/evals/.env or export it in your shell.`);
    }
  }
  return warnings;
}

/**
 * Check that required AI SDK provider packages are installed for the configured models.
 * @param {string[]} models
 * @returns {Promise<Array<{ pkg: string, reason: string }>>}
 */
async function checkProviderPackages(models) {
  const { createRequire } = await import('module');
  // Resolve from the project's node_modules, not the global CLI install
  const require = createRequire(join(process.cwd(), 'package.json'));
  const missing = [];
  const checked = new Set();

  try {
    require.resolve('ai');
  } catch {
    missing.push({ pkg: 'ai', reason: 'core AI SDK' });
  }

  for (const modelId of models) {
    const pkg = getProviderForModel(modelId);
    if (!pkg || checked.has(pkg)) continue;
    checked.add(pkg);
    try {
      require.resolve(pkg);
    } catch {
      missing.push({ pkg, reason: modelId });
    }
  }

  return missing;
}

/**
 * Run eval tests via vitest with the eval plugin.
 */
async function runEvals(args) {
  const { resolve, basename } = await import('path');
  const evalDir = findEvalDir();

  if (!evalDir) {
    console.error('No eval directory found. Run "sunpeak test init" to scaffold eval tests.');
    return 1;
  }

  const absEvalDir = resolve(process.cwd(), evalDir);

  // Load .env from eval directory before anything else
  loadEnvFile(absEvalDir);

  // Find eval config and load it to check models before launching vitest
  const configFile = findConfig([
    join(evalDir, 'eval.config.ts'),
    join(evalDir, 'eval.config.js'),
  ]);

  // Quick check: load the config to see if models are configured.
  // We do this by reading the file and checking for non-empty models array.
  // For a proper check, we'd need to evaluate the TS, but a quick heuristic
  // is to warn if we can detect an empty array.
  let configModels = null;
  if (configFile) {
    const configContent = readFileSync(configFile, 'utf-8');
    // Check if models array appears to be empty (all lines commented out)
    const modelsMatch = configContent.match(/models:\s*\[([\s\S]*?)\]/);
    if (modelsMatch) {
      const modelsBody = modelsMatch[1].trim();
      // Remove comments and whitespace to check if anything is actually configured
      const uncommented = modelsBody.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!uncommented || uncommented === ',') {
        console.log(`\nNo models configured in ${configFile}.`);
        console.log('To run evals, uncomment at least one model in your eval config:\n');
        console.log('  models: [');
        console.log("    'gpt-4o',              // requires OPENAI_API_KEY");
        console.log("    'claude-sonnet-4-20250514',  // requires ANTHROPIC_API_KEY");
        console.log("    'gemini-2.0-flash',    // requires GOOGLE_GENERATIVE_AI_API_KEY");
        console.log('  ],\n');
        return 0;
      }
      // Extract actual model strings for API key validation
      const modelStrings = [...uncommented.matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
      configModels = modelStrings;
    }
  }

  // Check for missing provider packages and API keys
  if (configModels && configModels.length > 0) {
    const missingPkgs = await checkProviderPackages(configModels);
    if (missingPkgs.length > 0) {
      console.error('\nMissing required packages for eval models:\n');
      for (const { pkg, reason } of missingPkgs) {
        console.error(`  ${pkg}  (needed for ${reason})`);
      }
      const installCmd = missingPkgs.map((m) => m.pkg).join(' ');
      console.error(`\nInstall with:\n\n  pnpm add -D ${installCmd}\n`);
      return 1;
    }

    const warnings = validateApiKeys(configModels);
    if (warnings.length > 0) {
      console.error('');
      for (const w of warnings) {
        console.error(`✗  ${w}`);
      }
      console.error('');
      return 1;
    }
  }

  // Use non-standard ports for auto-start to avoid conflicts with a running dev server.
  const autoStartMcpPort = 18920;
  const autoStartInspectorPort = 18921;
  // Default server for non-sunpeak projects (standard MCP port)
  const defaultMcpPort = 8000;
  let devServerHandle = null;
  let mcpPort = defaultMcpPort;

  if (isSunpeakProject() && !process.env.SUNPEAK_EVAL_SERVER) {
    // Auto-start dev server for sunpeak projects on non-standard ports
    mcpPort = autoStartMcpPort;
    try {
      devServerHandle = await startDevServer({
        inspectorPort: autoStartInspectorPort,
        mcpPort: autoStartMcpPort,
      });
    } catch (err) {
      console.error('Failed to start dev server:', err.message);
      return 1;
    }
  } else if (!process.env.SUNPEAK_EVAL_SERVER) {
    // For non-sunpeak projects, check if the server is running
    try {
      await fetch(`http://localhost:${defaultMcpPort}/health`, {
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      const defaultServer = `http://localhost:${defaultMcpPort}/mcp`;
      console.error(`MCP server not reachable at ${defaultServer}`);
      console.error('Make sure your MCP server is running, or set the server URL in eval.config.ts.\n');
      return 1;
    }
  }

  const defaultServer = `http://localhost:${mcpPort}/mcp`;

  // Use .ts extension so vitest handles TypeScript imports natively
  const vitestConfigPath = join(absEvalDir, '.eval-vitest.config.ts');

  // Use package exports so vitest resolves from the project's node_modules,
  // not the global CLI install. This ensures import('ai') finds project-local deps.
  const evalPluginImport = 'sunpeak/eval/plugin';
  const evalReporterImport = 'sunpeak/eval/reporter';

  // Clean up dev server and temp config
  const cleanupResources = () => {
    if (devServerHandle?.process) {
      devServerHandle.process.kill();
      devServerHandle = null;
    }
    try { unlinkSync(vitestConfigPath); } catch {}
  };
  // On unexpected signal, clean up and re-exit with conventional signal code
  const onSignal = (signal) => {
    cleanupResources();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };
  const onSigInt = () => onSignal('SIGINT');
  const onSigTerm = () => onSignal('SIGTERM');
  process.on('SIGINT', onSigInt);
  process.on('SIGTERM', onSigTerm);

  // Resolve config import path relative to the generated config file location
  const configImportPath = configFile
    ? './' + basename(configFile)
    : null;

  // Generate a vitest config that loads the eval config and plugin.
  // Imports use package names (sunpeak/eval/plugin) so vitest resolves from
  // the project's node_modules, ensuring import('ai') finds project-local deps.
  const vitestConfig = `
import { defineConfig } from 'vitest/config';
import { evalVitestPlugin } from '${evalPluginImport}';
${configImportPath ? `import evalConfig from ${JSON.stringify(configImportPath)};` : 'const evalConfig = { models: [], defaults: {} };'}

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.eval.ts', '**/*.eval.js'],
    reporters: ['default', '${evalReporterImport}'],
    testTimeout: 600000,
  },
  plugins: [
    evalVitestPlugin({
      server: evalConfig.server || process.env.SUNPEAK_EVAL_SERVER || ${JSON.stringify(defaultServer)},
      models: evalConfig.models || [],
      defaults: evalConfig.defaults || {},
    }),
  ],
});
`;

  writeFileSync(vitestConfigPath, vitestConfig);

  try {
    const code = await runChild(
      'pnpm',
      ['exec', 'vitest', 'run', '--config', vitestConfigPath, ...args]
    );
    return code;
  } finally {
    cleanupResources();
    process.removeListener('SIGINT', onSigInt);
    process.removeListener('SIGTERM', onSigTerm);
  }
}

/**
 * Find the eval tests directory.
 */
function findEvalDir() {
  const candidates = [
    'tests/evals',
    'tests/sunpeak/evals',
    // When running from within tests/sunpeak/ directly (non-JS projects)
    'evals',
  ];

  for (const candidate of candidates) {
    const full = join(process.cwd(), candidate);
    if (existsSync(full)) return candidate;
  }
  return null;
}
