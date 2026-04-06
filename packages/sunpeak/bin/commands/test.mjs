import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * sunpeak test — Run MCP server tests.
 *
 * No flags:                    Run unit + e2e tests
 * sunpeak test init            Scaffold test infrastructure
 * sunpeak test --unit          Run unit tests (vitest)
 * sunpeak test --e2e           Run e2e tests (Playwright)
 * sunpeak test --live          Run live tests against real hosts
 * sunpeak test --visual        Run e2e tests with visual regression comparison
 * sunpeak test --visual --update  Update visual regression baselines
 * sunpeak test [pattern]       Pass through to the relevant runner
 *
 * Flags are additive: --unit --e2e --live runs all three.
 * --visual implies --e2e and enables screenshot comparison.
 * --update implies --visual.
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
  let isVisual = args.includes('--visual');
  const isUpdate = args.includes('--update');
  const filteredArgs = args.filter(
    (a) => !['--unit', '--e2e', '--live', '--visual', '--update'].includes(a)
  );

  // --update implies --visual (no point updating without enabling visual)
  if (isUpdate) isVisual = true;

  const hasAnyScope = isUnit || isE2e || isLive || isVisual;

  // When extra args are present (file patterns, etc.) and no scope flags given,
  // default to e2e only — passing Playwright file patterns to vitest would fail.
  const hasExtraArgs = filteredArgs.length > 0;

  // Determine which suites to run.
  // No scope flags → unit + e2e (unless extra args narrow to e2e).
  // --visual implies e2e.
  const runUnit = hasAnyScope ? isUnit : !hasExtraArgs;
  const runE2e = hasAnyScope ? (isE2e || isVisual) : true;
  const runLive = isLive;

  const results = [];

  if (runUnit) {
    const code = await runChild('pnpm', ['exec', 'vitest', 'run', ...filteredArgs]);
    results.push({ suite: 'unit', code });
  }

  if (runE2e) {
    const code = await runPlaywright(filteredArgs, {
      configCandidates: [
        'playwright.config.ts',
        'playwright.config.js',
        'sunpeak.config.ts',
        'sunpeak.config.js',
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
      ],
      configRequired: true,
      configErrorMessage: 'No live test config found at tests/live/playwright.config.ts',
    });
    results.push({ suite: 'live', code });
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
