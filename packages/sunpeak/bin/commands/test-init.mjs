import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import * as p from '@clack/prompts';

/**
 * Default dependencies (real implementations).
 * Override in tests via the `deps` parameter.
 */
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
};

/**
 * sunpeak test init — Scaffold test infrastructure for MCP servers.
 *
 * Detects project type and scaffolds accordingly:
 * - Non-JS projects: self-contained tests/sunpeak/ directory
 * - JS/TS projects: root-level config + test files
 * - sunpeak projects: migrate to defineConfig()
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

  // Offer to install the testing skill
  const installSkill = await d.confirm({
    message: 'Install the test-mcp-server skill? (helps your coding agent write tests)',
    initialValue: true,
  });
  if (!d.isCancel(installSkill) && installSkill) {
    try {
      d.execSync('npx skills add Sunpeak-AI/sunpeak@test-mcp-server', {
        cwd: d.cwd(),
        stdio: 'inherit',
      });
    } catch {
      d.log.info('Skill install skipped. Install later: npx skills add Sunpeak-AI/sunpeak@test-mcp-server');
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
    "    // 'gpt-4o',                      // OPENAI_API_KEY",
    "    // 'gpt-4o-mini',                 // OPENAI_API_KEY",
    "    // 'o4-mini',                     // OPENAI_API_KEY",
    "    // 'claude-sonnet-4-20250514',    // ANTHROPIC_API_KEY",
    "    // 'gemini-2.0-flash',            // GOOGLE_GENERATIVE_AI_API_KEY",
    "  ],",
    "",
    "  defaults: {",
    "    runs: 10,          // Number of times to run each case per model",
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
    `import { expect } from 'vitest';
import { defineEval } from 'sunpeak/eval';

/**
 * Example eval — tests whether LLMs call your tools correctly.
 *
 * To get started:
 * 1. Configure models in eval.config.ts (uncomment the ones you want)
 * 2. Install the AI SDK and provider packages: pnpm add ai @ai-sdk/openai
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

  // smoke test — runnable out of the box, verifies the server is reachable
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

  // Scaffold eval boilerplate
  scaffoldEvals(join(testDir, 'evals'), { server, d });

  d.log.success('Created tests/sunpeak/ with config and starter test.');
  d.log.step('Next steps:');
  d.log.message('  cd tests/sunpeak');
  d.log.message('  npm install');
  d.log.message('  npx playwright install chromium');
  d.log.message('  npx sunpeak test');
  d.log.message('  npx sunpeak test --eval  (after configuring models in evals/eval.config.ts)');
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

  // Create test directory and smoke test
  const testDir = join(cwd, 'tests', 'e2e');
  d.mkdirSync(testDir, { recursive: true });

  const testPath = join(testDir, 'smoke.test.ts');
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

  // Scaffold eval boilerplate
  const evalsDir = join(cwd, 'tests', 'evals');
  scaffoldEvals(evalsDir, { server, d });

  d.log.step('Next steps:');
  d.log.message('  npm install -D sunpeak @playwright/test');
  d.log.message('  npx playwright install chromium');
  d.log.message('  npx sunpeak test');
  d.log.message('  npx sunpeak test --eval  (after configuring models in tests/evals/eval.config.ts)');
}

async function initSunpeakProject(d) {
  d.log.info('Detected sunpeak project. Updating config to use defineConfig().');

  const cwd = d.cwd();
  const configPath = join(cwd, 'playwright.config.ts');

  if (d.existsSync(configPath)) {
    const content = d.readFileSync(configPath, 'utf-8');
    if (content.includes('sunpeak/test/config')) {
      d.log.info('Config already uses sunpeak/test/config. Nothing to do.');
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

  // Scaffold eval boilerplate
  const evalsDir = join(cwd, 'tests', 'evals');
  scaffoldEvals(evalsDir, { isSunpeak: true, d });

  d.log.step('Migrate test files:');
  d.log.message('  Replace: import { test, expect } from "@playwright/test"');
  d.log.message('  With:    import { test, expect } from "sunpeak/test"');
  d.log.message('');
  d.log.message('  Use the `mcp` fixture instead of raw page navigation.');
  d.log.message('  See sunpeak docs for migration examples.');
  d.log.message('  Run: sunpeak test --eval  (after configuring models in tests/evals/eval.config.ts)');
}
