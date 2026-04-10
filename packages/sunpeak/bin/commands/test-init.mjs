import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import * as p from '@clack/prompts';
import { EVAL_PROVIDERS, generateModelLines } from '../lib/eval/eval-providers.mjs';
import { detectPackageManager } from '../utils.mjs';

/**
 * Default dependencies (real implementations).
 * Override in tests via the `deps` parameter.
 */
async function defaultSelectProviders() {
  const selected = await p.multiselect({
    message: 'AI providers for evals (space to toggle, enter to skip)',
    options: EVAL_PROVIDERS.map((prov) => ({ value: prov, label: prov.label })),
    initialValues: [],
    required: false,
  });
  if (p.isCancel(selected)) return [];
  return selected;
}

export const defaultDeps = {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  execSync,
  cwd: () => process.cwd(),
  intro: p.intro,
  outro: p.outro,
  confirm: p.confirm,
  isCancel: p.isCancel,
  select: p.select,
  text: p.text,
  log: p.log,
  password: p.password,
  selectProviders: defaultSelectProviders,
  detectPackageManager,
};

/**
 * sunpeak test init — Scaffold test infrastructure for MCP servers.
 *
 * Detects project type and scaffolds accordingly:
 * - Non-JS projects: self-contained tests/sunpeak/ directory
 * - JS/TS projects: root-level config + test files
 * - sunpeak projects: migrate to defineConfig()
 *
 * Scaffolds all 5 test types:
 * 1. E2E tests — Playwright-based inspector tests (mcp fixture)
 * 2. Visual regression — Screenshot comparison via mcp.screenshot()
 * 3. Live tests — Test against real ChatGPT/Claude hosts
 * 4. Evals — Multi-model tool calling reliability tests
 * 5. Unit tests — Direct tool handler tests (JS/TS projects only)
 */
export async function testInit(args = [], deps = defaultDeps) {
  const d = { ...defaultDeps, ...deps };

  d.intro('Setting up sunpeak tests');

  // Parse --server flag from CLI args
  const serverIdx = args.indexOf('--server');
  const cliServer =
    serverIdx !== -1 && args[serverIdx + 1]
      ? args[serverIdx + 1]
      : undefined;

  const projectType = detectProjectType(d);

  if (projectType === 'sunpeak') {
    await initSunpeakProject(d);
  } else if (projectType === 'js') {
    await initJsProject(cliServer, d);
  } else {
    await initExternalProject(cliServer, d);
  }

  // Offer to configure eval providers
  const providers = await d.selectProviders();
  if (!d.isCancel(providers) && providers.length > 0) {
    const pm = d.detectPackageManager();
    const pkgsToInstall = ['ai', ...providers.map((p) => p.pkg)];
    const installCmd = `${pm} add -D ${pkgsToInstall.join(' ')}`;
    try {
      d.execSync(installCmd, { cwd: d.cwd(), stdio: 'inherit' });
    } catch {
      d.log.info(`Provider install failed. Install manually: ${installCmd}`);
    }

    // Uncomment selected models in eval.config.ts
    const evalDir = d.existsSync(join(d.cwd(), 'tests', 'evals'))
      ? join(d.cwd(), 'tests', 'evals')
      : d.existsSync(join(d.cwd(), 'tests', 'sunpeak', 'evals'))
        ? join(d.cwd(), 'tests', 'sunpeak', 'evals')
        : null;
    if (evalDir) {
      const configPath = join(evalDir, 'eval.config.ts');
      if (d.existsSync(configPath)) {
        let config = d.readFileSync(configPath, 'utf-8');
        for (const prov of providers) {
          for (const model of prov.models) {
            config = config.replace(
              new RegExp(`^(\\s*)// ('${model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',?.*)$`, 'm'),
              '$1$2'
            );
          }
        }
        d.writeFileSync(configPath, config);
      }

      // Prompt for API keys and write .env
      const envLines = [];
      const seen = new Set();
      for (const prov of providers) {
        if (seen.has(prov.envVar)) continue;
        seen.add(prov.envVar);
        const key = await d.password({
          message: `${prov.envVar} (enter to skip)`,
          mask: '*',
        });
        if (!d.isCancel(key) && key) {
          envLines.push(`${prov.envVar}=${key}`);
        }
      }
      if (envLines.length > 0 && evalDir) {
        const relEnvPath = evalDir.startsWith(d.cwd()) ? evalDir.slice(d.cwd().length + 1) : evalDir;
        d.writeFileSync(join(evalDir, '.env'), envLines.join('\n') + '\n');
        d.log.info(`API keys saved to ${relEnvPath}/.env (gitignored)`);
      }
    }
  }

  // Offer to install the testing skill
  const installSkill = await d.confirm({
    message: 'Install the test-mcp-server skill? (helps your coding agent write tests)',
    initialValue: true,
  });
  if (!d.isCancel(installSkill) && installSkill) {
    try {
      d.execSync('pnpm dlx skills add Sunpeak-AI/sunpeak@test-mcp-server', {
        cwd: d.cwd(),
        stdio: 'inherit',
      });
    } catch {
      d.log.info('Skill install skipped. Install later: pnpm dlx skills add Sunpeak-AI/sunpeak@test-mcp-server');
    }
  }

  d.outro('Done!');
}

function detectProjectType(d) {
  const cwd = d.cwd();
  const pkgPath = join(cwd, 'package.json');

  if (d.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(d.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if ('sunpeak' in deps) return 'sunpeak';
      return 'js';
    } catch {
      return 'js';
    }
  }

  // Non-JS project (Python, Go, Rust, etc.)
  return 'external';
}

async function getServerConfig(cliServer, d) {
  // If provided via --server flag, detect type automatically
  if (cliServer) {
    if (cliServer.startsWith('http://') || cliServer.startsWith('https://')) {
      return { type: 'url', value: cliServer };
    }
    return { type: 'command', value: cliServer };
  }

  const serverType = await d.select({
    message: 'How does your MCP server start?',
    options: [
      { value: 'command', label: 'Command (e.g., python server.py)' },
      { value: 'url', label: 'HTTP URL (e.g., http://localhost:8000/mcp)' },
      { value: 'later', label: 'Configure later' },
    ],
  });

  if (d.isCancel(serverType)) process.exit(0);

  if (serverType === 'command') {
    const command = await d.text({
      message: 'Server start command:',
      placeholder: 'python src/server.py',
    });
    if (d.isCancel(command)) process.exit(0);
    return { type: 'command', value: command };
  }

  if (serverType === 'url') {
    const url = await d.text({
      message: 'Server URL:',
      placeholder: 'http://localhost:8000/mcp',
    });
    if (d.isCancel(url)) process.exit(0);
    return { type: 'url', value: url };
  }

  return { type: 'later' };
}

function generateServerConfigBlock(server, relativeTo = '.') {
  if (server.type === 'later') {
    return `  // TODO: Configure your MCP server connection
  // server: {
  //   command: 'python',
  //   args: ['server.py'],
  // },`;
  }
  if (server.type === 'url') {
    return `  server: {
    url: '${server.value}',
  },`;
  }
  // Parse command into command + args
  const parts = server.value.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);
  // Make paths relative from test directory
  const relativeArgs = args.map((a) =>
    a.startsWith('/') || a.startsWith('./') || a.startsWith('../')
      ? `'${relativeTo}/${a}'`
      : `'${a}'`
  );
  return `  server: {
    command: '${cmd}',
    args: [${relativeArgs.join(', ')}],
  },`;
}

/**
 * Scaffold eval boilerplate into a directory.
 * @param {string} evalsDir - Directory to create eval files in
 * @param {{ server?: object, isSunpeak?: boolean, d?: object }} options
 */
function scaffoldEvals(evalsDir, { server, isSunpeak, d: deps } = {}) {
  const d = deps || defaultDeps;
  if (d.existsSync(join(evalsDir, 'eval.config.ts'))) {
    d.log.info('Eval config already exists. Skipping eval scaffold.');
    return;
  }

  d.mkdirSync(evalsDir, { recursive: true });

  // Generate server line for eval config
  let serverLine = '  // server: \'http://localhost:8000/mcp\',';
  if (isSunpeak) {
    serverLine = '  // Omit server for sunpeak projects (auto-detected).\n  // server: \'http://localhost:8000/mcp\',';
  } else if (server?.type === 'url') {
    serverLine = `  server: '${server.value}',`;
  } else if (server?.type === 'command') {
    serverLine = `  server: '${server.value}',`;
  }

  // Build the eval config content
  const configLines = [
    "import { defineEvalConfig } from 'sunpeak/eval';",
    "",
    "// API keys are loaded automatically from .env in this directory (gitignored).",
    "// See .env.example for the format.",
    "",
    "export default defineEvalConfig({",
    "  // MCP server to test.",
    serverLine,
    "",
    "  models: [",
    "    // Uncomment models and install their provider packages:",
    ...generateModelLines(),
    "  ],",
    "",
    "  defaults: {",
    "    runs: 5,           // Number of times to run each case per model",
    "    maxSteps: 1,       // Max tool call steps per run",
    "    temperature: 0,    // 0 for most deterministic results",
    "    timeout: 30_000,   // Timeout per run in ms",
    "  },",
    "});",
    "",
  ];

  d.writeFileSync(join(evalsDir, 'eval.config.ts'), configLines.join('\n'));

  // Scaffold .env template
  d.writeFileSync(
    join(evalsDir, '.env.example'),
    `# Copy this file to .env and fill in your API keys.
# .env is gitignored — never commit API keys.
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# GOOGLE_GENERATIVE_AI_API_KEY=...
`
  );

  d.writeFileSync(
    join(evalsDir, 'example.eval.ts'),
    `import { defineEval } from 'sunpeak/eval';

/**
 * Example eval — tests whether LLMs call your tools correctly.
 *
 * To get started:
 * 1. Configure models in eval.config.ts (uncomment the ones you want)
 * 2. Install the AI SDK and provider packages (e.g. pnpm add ai @ai-sdk/openai)
 * 3. Copy .env.example to .env and add your API keys
 * 4. Replace this file with evals for your own tools
 * 5. Run: sunpeak test --eval
 *
 * Each case sends a prompt to every configured model and checks
 * that the model calls the expected tool with the expected arguments.
 * Cases run multiple times (configured via \`runs\` in eval.config.ts)
 * to measure reliability across non-deterministic LLM responses.
 */
export default defineEval({
  // This eval is skipped when no models are configured.
  // Delete this file and create your own evals to get started.
  cases: [
    {
      name: 'example (replace me)',
      prompt: 'Show me a demo',
      // expect which tool gets called and (optionally) its arguments:
      expect: {
        tool: 'your-tool-name',
        // args: { key: 'value' },
      },
    },
  ],
});
`
  );

  d.log.success(`Created ${evalsDir}/ with eval config and example.`);
}

/**
 * Scaffold a visual regression test file.
 * @param {string} filePath - Full path to the visual test file
 * @param {object} d - Dependencies
 */
function scaffoldVisualTest(filePath, d) {
  if (d.existsSync(filePath)) {
    d.log.info('Visual test already exists. Skipping.');
    return;
  }

  d.writeFileSync(
    filePath,
    `import { test, expect } from 'sunpeak/test';

/**
 * Visual regression tests — compare screenshots against saved baselines.
 *
 * Screenshots only run with: sunpeak test --visual
 * Update baselines with:     sunpeak test --visual --update
 *
 * During normal \`sunpeak test\` runs, screenshot() calls are silently
 * skipped so these tests still pass without baselines.
 *
 * Uncomment the tests below and replace 'your-tool' with your tool name.
 */

// test('tool renders correctly in light mode', async ({ mcp }) => {
//   const result = await mcp.callTool('your-tool', { key: 'value' }, { theme: 'light' });
//   expect(result).not.toBeError();
//
//   // Wait for UI to render, then screenshot:
//   // const app = result.app();
//   // await expect(app.getByText('Expected text')).toBeVisible();
//   // await mcp.screenshot('tool-light');
// });

// test('tool renders correctly in dark mode', async ({ mcp }) => {
//   const result = await mcp.callTool('your-tool', { key: 'value' }, { theme: 'dark' });
//   expect(result).not.toBeError();
//
//   // const app = result.app();
//   // await expect(app.getByText('Expected text')).toBeVisible();
//   // await mcp.screenshot('tool-dark');
// });

// Full-page screenshot (captures the inspector chrome too):
// test('full page renders correctly', async ({ mcp }) => {
//   const result = await mcp.callTool('your-tool', {}, { theme: 'light' });
//   const app = result.app();
//   await expect(app.getByText('Expected text')).toBeVisible();
//   await mcp.screenshot('tool-page', { target: 'page', maxDiffPixelRatio: 0.02 });
// });
`
  );
  d.log.success(`Created ${filePath}`);
}

/**
 * Scaffold live test boilerplate (test against real ChatGPT/Claude).
 * @param {string} liveDir - Directory to create live test files in
 * @param {{ isSunpeak?: boolean, d: object }} options
 */
function scaffoldLiveTests(liveDir, { isSunpeak, d } = {}) {
  if (d.existsSync(join(liveDir, 'playwright.config.ts'))) {
    d.log.info('Live test config already exists. Skipping live test scaffold.');
    return;
  }

  d.mkdirSync(liveDir, { recursive: true });

  // Live test playwright config
  const liveConfigPreamble = `import { defineLiveConfig } from 'sunpeak/test/live/config';

/**
 * Live tests run against real AI hosts (ChatGPT, Claude).
 *
 * Prerequisites:
 * 1. Your MCP server must be accessible via a public URL (e.g., ngrok tunnel)
 * 2. The server must be registered as an MCP action in the host
 * 3. Run: sunpeak test --live
 *
 * On first run, a browser window opens for you to log in to the host.
 * The session is saved for subsequent runs (typically lasts a few hours).`;

  const liveConfigExport = `export default defineLiveConfig({
  // hosts: ['chatgpt'],           // Which hosts to test against
  // colorScheme: 'light',         // Default color scheme
  // viewport: { width: 1280, height: 720 },
  devOverlay: false,
});
`;

  const configContent = isSunpeak
    ? `${liveConfigPreamble}
 */
${liveConfigExport}`
    : `${liveConfigPreamble}
 *
 * NOTE: defineLiveConfig() starts a local sunpeak dev server as its backend.
 * If your MCP server is not a sunpeak project, you may need to customize the
 * webServer option in the Playwright config below to start your own server,
 * or remove webServer entirely if your server is already running.
 */
${liveConfigExport}`;

  d.writeFileSync(join(liveDir, 'playwright.config.ts'), configContent);

  // Live test example
  d.writeFileSync(
    join(liveDir, 'example.test.ts'),
    `import { test, expect } from 'sunpeak/test/live';

/**
 * Live tests invoke tools through real AI hosts (ChatGPT, Claude).
 *
 * The \`live\` fixture provides:
 * - live.invoke(toolName) — invoke a tool and get the app locator
 * - live.setColorScheme('dark', app) — switch theme while app is visible
 * - live.page — the underlying Playwright page
 *
 * Run with: sunpeak test --live
 *
 * These tests are excluded from normal \`sunpeak test\` runs because
 * they require host accounts and cost API credits.
 */

// Uncomment and replace 'your-tool' with the tool name as it appears in the host.
// test('tool renders in the host', async ({ live }) => {
//   const app = await live.invoke('your-tool');
//
//   await expect(app.getByText('Expected text')).toBeVisible({ timeout: 15_000 });
//
//   // Test dark mode:
//   await live.setColorScheme('dark', app);
//   await expect(app.getByText('Expected text')).toBeVisible();
// });
`
  );

  d.log.success(`Created ${liveDir}/ with live test config and example.`);
}

/**
 * Scaffold a unit test example for JS/TS projects.
 * @param {string} filePath - Full path to the unit test file
 * @param {object} d - Dependencies
 */
function scaffoldUnitTest(filePath, d) {
  if (d.existsSync(filePath)) {
    d.log.info('Unit test already exists. Skipping.');
    return;
  }

  d.mkdirSync(dirname(filePath), { recursive: true });

  d.writeFileSync(
    filePath,
    `import { describe, it, expect } from 'vitest';

/**
 * Unit tests for your MCP tool handlers.
 *
 * Import your tool handler directly and test its input/output
 * without starting the MCP server or inspector.
 *
 * Run with: sunpeak test --unit
 *
 * To set up vitest, add it to your devDependencies:
 *   npm install -D vitest
 *
 * Uncomment and customize the tests below for your tools.
 */

// import handler, { tool, schema } from '../../src/tools/your-tool';
// const extra = {} as Parameters<typeof handler>[1];

// describe('your tool', () => {
//   it('returns expected output', async () => {
//     const result = await handler({ key: 'value' }, extra);
//     expect(result.structuredContent).toBeDefined();
//   });
//
//   it('exports correct tool config', () => {
//     expect(tool.title).toBe('Your Tool');
//     expect(tool.annotations?.readOnlyHint).toBe(true);
//   });
// });
`
  );
  d.log.success(`Created ${filePath}`);
}

async function initExternalProject(cliServer, d) {
  d.log.info('Detected non-JS project. Creating self-contained test directory.');

  const server = await getServerConfig(cliServer, d);
  const testDir = join(d.cwd(), 'tests', 'sunpeak');

  if (d.existsSync(testDir)) {
    d.log.warn('tests/sunpeak/ already exists. Skipping scaffold.');
    return;
  }

  d.mkdirSync(testDir, { recursive: true });

  // package.json
  d.writeFileSync(
    join(testDir, 'package.json'),
    JSON.stringify(
      {
        private: true,
        type: 'module',
        devDependencies: {
          '@types/node': 'latest',
          sunpeak: 'latest',
          '@playwright/test': 'latest',
        },
        scripts: {
          test: 'sunpeak test',
        },
      },
      null,
      2
    ) + '\n'
  );

  // sunpeak.config.ts (used as playwright config)
  const serverBlock = generateServerConfigBlock(server, '../..');
  d.writeFileSync(
    join(testDir, 'playwright.config.ts'),
    `import { defineConfig } from 'sunpeak/test/config';

export default defineConfig({
${serverBlock}
});
`
  );

  // tsconfig.json
  d.writeFileSync(
    join(testDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          esModuleInterop: true,
        },
      },
      null,
      2
    ) + '\n'
  );

  // 1. E2E test — smoke test, verifies the server is reachable
  d.writeFileSync(
    join(testDir, 'smoke.test.ts'),
    `import { test, expect } from 'sunpeak/test';

test('server is reachable and inspector loads', async ({ mcp }) => {
  // Verify the inspector page loads successfully
  await expect(mcp.page.locator('#root')).not.toBeEmpty();
});

// Uncomment and customize for your tools:
// test('my tool renders correctly', async ({ mcp }) => {
//   const result = await mcp.callTool('your-tool', { key: 'value' });
//   expect(result).not.toBeError();
//
//   // If your tool has a UI:
//   // const app = result.app();
//   // await expect(app.getByText('Hello')).toBeVisible();
// });
`
  );

  // 2. Visual regression test
  scaffoldVisualTest(join(testDir, 'visual.test.ts'), d);

  // 3. Live tests
  scaffoldLiveTests(join(testDir, 'live'), { isSunpeak: false, d });

  // 4. Eval boilerplate
  scaffoldEvals(join(testDir, 'evals'), { server, d });

  d.log.success('Created tests/sunpeak/ with all test types.');
  d.log.step('Next steps:');
  const pm = d.detectPackageManager();
  d.log.message('  cd tests/sunpeak');
  d.log.message(`  ${pm} install`);
  d.log.message(`  ${pm} exec playwright install chromium`);
  d.log.message('');
  d.log.message('  sunpeak test              # E2E tests');
  d.log.message('  sunpeak test --visual      # Visual regression (generates baselines on first run)');
  d.log.message('  sunpeak test --live         # Live tests against real hosts (requires login)');
  d.log.message('  sunpeak test --eval         # Multi-model evals (configure models in evals/eval.config.ts)');
}

async function initJsProject(cliServer, d) {
  d.log.info('Detected JS/TS project. Adding test config at project root.');

  const server = await getServerConfig(cliServer, d);
  const cwd = d.cwd();

  // Create playwright.config.ts
  const configPath = join(cwd, 'playwright.config.ts');
  if (d.existsSync(configPath)) {
    d.log.warn('playwright.config.ts already exists. Skipping config creation.');
  } else {
    const serverBlock = generateServerConfigBlock(server);
    d.writeFileSync(
      configPath,
      `import { defineConfig } from 'sunpeak/test/config';

export default defineConfig({
${serverBlock}
});
`
    );
    d.log.success('Created playwright.config.ts');
  }

  // 1. E2E test — smoke test
  const e2eDir = join(cwd, 'tests', 'e2e');
  d.mkdirSync(e2eDir, { recursive: true });

  const testPath = join(e2eDir, 'smoke.test.ts');
  if (!d.existsSync(testPath)) {
    d.writeFileSync(
      testPath,
      `import { test, expect } from 'sunpeak/test';

test('server is reachable and inspector loads', async ({ mcp }) => {
  await expect(mcp.page.locator('#root')).not.toBeEmpty();
});

// Uncomment and customize for your tools:
// test('my tool renders correctly', async ({ mcp }) => {
//   const result = await mcp.callTool('your-tool', { key: 'value' });
//   expect(result).not.toBeError();
//
//   // If your tool has a UI:
//   // const app = result.app();
//   // await expect(app.getByText('Hello')).toBeVisible();
// });
`
    );
    d.log.success('Created tests/e2e/smoke.test.ts');
  }

  // 2. Visual regression test
  scaffoldVisualTest(join(e2eDir, 'visual.test.ts'), d);

  // 3. Live tests
  scaffoldLiveTests(join(cwd, 'tests', 'live'), { isSunpeak: false, d });

  // 4. Eval boilerplate
  scaffoldEvals(join(cwd, 'tests', 'evals'), { server, d });

  // 5. Unit test
  scaffoldUnitTest(join(cwd, 'tests', 'unit', 'example.test.ts'), d);

  const pkgMgr = d.detectPackageManager();
  d.log.step('Next steps:');
  d.log.message(`  ${pkgMgr} add -D sunpeak @playwright/test vitest`);
  d.log.message(`  ${pkgMgr} exec playwright install chromium`);
  d.log.message('');
  d.log.message('  sunpeak test              # E2E tests');
  d.log.message('  sunpeak test --unit        # Unit tests (vitest)');
  d.log.message('  sunpeak test --visual      # Visual regression');
  d.log.message('  sunpeak test --live         # Live tests against real hosts');
  d.log.message('  sunpeak test --eval         # Multi-model evals');
}

async function initSunpeakProject(d) {
  d.log.info('Detected sunpeak project. Updating config to use defineConfig().');

  const cwd = d.cwd();
  const configPath = join(cwd, 'playwright.config.ts');

  if (d.existsSync(configPath)) {
    const content = d.readFileSync(configPath, 'utf-8');
    if (content.includes('sunpeak/test/config')) {
      d.log.info('Config already uses sunpeak/test/config. Nothing to do.');
    } else {
      d.log.warn('playwright.config.ts exists but does not use sunpeak/test/config.');
      d.log.message('  To migrate, replace your config with:');
      d.log.message("    import { defineConfig } from 'sunpeak/test/config';");
      d.log.message('    export default defineConfig();');
    }
  } else {
    d.writeFileSync(
      configPath,
      `import { defineConfig } from 'sunpeak/test/config';

export default defineConfig();
`
    );
    d.log.success('Updated playwright.config.ts to use defineConfig()');
  }

  // Scaffold missing test types

  // 1. Visual regression test
  const e2eDir = join(cwd, 'tests', 'e2e');
  d.mkdirSync(e2eDir, { recursive: true });
  scaffoldVisualTest(join(e2eDir, 'visual.test.ts'), d);

  // 2. Live tests
  scaffoldLiveTests(join(cwd, 'tests', 'live'), { isSunpeak: true, d });

  // 3. Eval boilerplate
  scaffoldEvals(join(cwd, 'tests', 'evals'), { isSunpeak: true, d });

  // 4. Unit test
  scaffoldUnitTest(join(cwd, 'tests', 'unit', 'example.test.ts'), d);

  d.log.step('Scaffolded test types:');
  d.log.message('  tests/e2e/visual.test.ts    — Visual regression (sunpeak test --visual)');
  d.log.message('  tests/live/                 — Live host tests (sunpeak test --live)');
  d.log.message('  tests/evals/                — Multi-model evals (sunpeak test --eval)');
  d.log.message('  tests/unit/example.test.ts  — Unit tests (sunpeak test --unit)');
  d.log.message('');
  d.log.message('  Migrate existing e2e tests:');
  d.log.message('  Replace: import { test, expect } from "@playwright/test"');
  d.log.message('  With:    import { test, expect } from "sunpeak/test"');
  d.log.message('');
  d.log.message('  Use the `mcp` fixture instead of raw page navigation.');
  d.log.message('  See sunpeak docs for migration examples.');
}
