import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as p from '@clack/prompts';

/**
 * sunpeak test init — Scaffold test infrastructure for MCP servers.
 *
 * Detects project type and scaffolds accordingly:
 * - Non-JS projects: self-contained tests/sunpeak/ directory
 * - JS/TS projects: root-level config + test files
 * - sunpeak projects: migrate to defineConfig()
 */
export async function testInit(args = []) {
  p.intro('Setting up sunpeak tests');

  // Parse --server flag from CLI args
  const serverIdx = args.indexOf('--server');
  const cliServer =
    serverIdx !== -1 && args[serverIdx + 1]
      ? args[serverIdx + 1]
      : undefined;

  const projectType = detectProjectType();

  if (projectType === 'sunpeak') {
    await initSunpeakProject();
  } else if (projectType === 'js') {
    await initJsProject(cliServer);
  } else {
    await initExternalProject(cliServer);
  }

  p.outro('Done!');
}

function detectProjectType() {
  const cwd = process.cwd();
  const pkgPath = join(cwd, 'package.json');

  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
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

async function getServerConfig(cliServer) {
  // If provided via --server flag, detect type automatically
  if (cliServer) {
    if (cliServer.startsWith('http://') || cliServer.startsWith('https://')) {
      return { type: 'url', value: cliServer };
    }
    return { type: 'command', value: cliServer };
  }

  const serverType = await p.select({
    message: 'How does your MCP server start?',
    options: [
      { value: 'command', label: 'Command (e.g., python server.py)' },
      { value: 'url', label: 'HTTP URL (e.g., http://localhost:8000/mcp)' },
      { value: 'later', label: 'Configure later' },
    ],
  });

  if (p.isCancel(serverType)) process.exit(0);

  if (serverType === 'command') {
    const command = await p.text({
      message: 'Server start command:',
      placeholder: 'python src/server.py',
    });
    if (p.isCancel(command)) process.exit(0);
    return { type: 'command', value: command };
  }

  if (serverType === 'url') {
    const url = await p.text({
      message: 'Server URL:',
      placeholder: 'http://localhost:8000/mcp',
    });
    if (p.isCancel(url)) process.exit(0);
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
 * @param {{ server?: object, isSunpeak?: boolean }} options
 */
function scaffoldEvals(evalsDir, { server, isSunpeak } = {}) {
  if (existsSync(join(evalsDir, 'eval.config.ts'))) {
    p.log.info('Eval config already exists. Skipping eval scaffold.');
    return;
  }

  mkdirSync(evalsDir, { recursive: true });

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

  writeFileSync(join(evalsDir, 'eval.config.ts'), configLines.join('\n'));

  // Scaffold .env template
  writeFileSync(
    join(evalsDir, '.env.example'),
    `# Copy this file to .env and fill in your API keys.
# .env is gitignored — never commit API keys.
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# GOOGLE_GENERATIVE_AI_API_KEY=...
`
  );

  writeFileSync(
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

  p.log.success(`Created ${evalsDir}/ with eval config and example.`);
}

async function initExternalProject(cliServer) {
  p.log.info('Detected non-JS project. Creating self-contained test directory.');

  const server = await getServerConfig(cliServer);
  const testDir = join(process.cwd(), 'tests', 'sunpeak');

  if (existsSync(testDir)) {
    p.log.warn('tests/sunpeak/ already exists. Skipping scaffold.');
    return;
  }

  mkdirSync(testDir, { recursive: true });

  // package.json
  writeFileSync(
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
  writeFileSync(
    join(testDir, 'playwright.config.ts'),
    `import { defineConfig } from 'sunpeak/test/config';

export default defineConfig({
${serverBlock}
});
`
  );

  // tsconfig.json
  writeFileSync(
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
  writeFileSync(
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
  scaffoldEvals(join(testDir, 'evals'), { server });

  p.log.success('Created tests/sunpeak/ with config and starter test.');
  p.log.step('Next steps:');
  p.log.message('  cd tests/sunpeak');
  p.log.message('  npm install');
  p.log.message('  npx playwright install chromium');
  p.log.message('  npx sunpeak test');
  p.log.message('  npx sunpeak test --eval  (after configuring models in evals/eval.config.ts)');
}

async function initJsProject(cliServer) {
  p.log.info('Detected JS/TS project. Adding test config at project root.');

  const server = await getServerConfig(cliServer);
  const cwd = process.cwd();

  // Create playwright.config.ts
  const configPath = join(cwd, 'playwright.config.ts');
  if (existsSync(configPath)) {
    p.log.warn('playwright.config.ts already exists. Skipping config creation.');
  } else {
    const serverBlock = generateServerConfigBlock(server);
    writeFileSync(
      configPath,
      `import { defineConfig } from 'sunpeak/test/config';

export default defineConfig({
${serverBlock}
});
`
    );
    p.log.success('Created playwright.config.ts');
  }

  // Create test directory and smoke test
  const testDir = join(cwd, 'tests', 'e2e');
  mkdirSync(testDir, { recursive: true });

  const testPath = join(testDir, 'smoke.test.ts');
  if (!existsSync(testPath)) {
    writeFileSync(
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
    p.log.success('Created tests/e2e/smoke.test.ts');
  }

  // Scaffold eval boilerplate
  const evalsDir = join(cwd, 'tests', 'evals');
  scaffoldEvals(evalsDir, { server });

  p.log.step('Next steps:');
  p.log.message('  npm install -D sunpeak @playwright/test');
  p.log.message('  npx playwright install chromium');
  p.log.message('  npx sunpeak test');
  p.log.message('  npx sunpeak test --eval  (after configuring models in tests/evals/eval.config.ts)');
}

async function initSunpeakProject() {
  p.log.info('Detected sunpeak project. Updating config to use defineConfig().');

  const cwd = process.cwd();
  const configPath = join(cwd, 'playwright.config.ts');

  if (existsSync(configPath)) {
    const content = readFileSync(configPath, 'utf-8');
    if (content.includes('sunpeak/test/config')) {
      p.log.info('Config already uses sunpeak/test/config. Nothing to do.');
    }
  } else {
    writeFileSync(
      configPath,
      `import { defineConfig } from 'sunpeak/test/config';

export default defineConfig();
`
    );
    p.log.success('Updated playwright.config.ts to use defineConfig()');
  }

  // Scaffold eval boilerplate
  const evalsDir = join(cwd, 'tests', 'evals');
  scaffoldEvals(evalsDir, { isSunpeak: true });

  p.log.step('Migrate test files:');
  p.log.message('  Replace: import { test, expect } from "@playwright/test"');
  p.log.message('  With:    import { test, expect } from "sunpeak/test"');
  p.log.message('');
  p.log.message('  Use the `mcp` fixture instead of raw page navigation.');
  p.log.message('  See sunpeak docs for migration examples.');
  p.log.message('  Run: sunpeak test --eval  (after configuring models in tests/evals/eval.config.ts)');
}
