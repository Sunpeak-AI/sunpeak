import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * sunpeak test — Run MCP server tests.
 *
 * sunpeak test              Run e2e tests (Playwright)
 * sunpeak test init         Scaffold test infrastructure
 * sunpeak test --unit       Run unit tests (vitest)
 * sunpeak test --live       Run live tests against real hosts
 * sunpeak test [pattern]    Pass through to Playwright
 */
export async function runTest(args) {
  // Handle `sunpeak test init` subcommand
  if (args[0] === 'init') {
    const { testInit } = await import('./test-init.mjs');
    await testInit(args.slice(1));
    return;
  }

  const isUnit = args.includes('--unit');
  const isLive = args.includes('--live');
  const filteredArgs = args.filter((a) => a !== '--unit' && a !== '--live');

  if (isUnit) {
    // Run vitest
    const child = spawn('pnpm', ['exec', 'vitest', 'run', ...filteredArgs], {
      stdio: 'inherit',
      env: { ...process.env },
    });
    child.on('exit', (code) => process.exit(code ?? 1));
    return;
  }

  // Find the appropriate Playwright config
  let configArgs = [];
  if (isLive) {
    const liveConfig = findConfig([
      'tests/live/playwright.config.ts',
      'tests/live/playwright.config.js',
    ]);
    if (liveConfig) {
      configArgs = ['--config', liveConfig];
    } else {
      console.error('No live test config found at tests/live/playwright.config.ts');
      process.exit(1);
    }
  } else {
    // Default: e2e tests — look for config in standard locations
    const e2eConfig = findConfig([
      'playwright.config.ts',
      'playwright.config.js',
      'sunpeak.config.ts',
      'sunpeak.config.js',
    ]);
    if (e2eConfig) {
      configArgs = ['--config', e2eConfig];
    }
    // If no config found, let Playwright use its defaults
  }

  const child = spawn(
    'pnpm',
    ['exec', 'playwright', 'test', ...configArgs, ...filteredArgs],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        SUNPEAK_DEV_OVERLAY: process.env.SUNPEAK_DEV_OVERLAY ?? 'false',
      },
    }
  );
  child.on('exit', (code) => process.exit(code ?? 1));
}

function findConfig(candidates) {
  for (const candidate of candidates) {
    const full = join(process.cwd(), candidate);
    if (existsSync(full)) return candidate;
  }
  return null;
}
