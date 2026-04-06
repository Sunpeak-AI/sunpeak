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

  p.log.success('Created tests/sunpeak/ with config and starter test.');
  p.log.step('Next steps:');
  p.log.message('  cd tests/sunpeak');
  p.log.message('  npm install');
  p.log.message('  npx playwright install chromium');
  p.log.message('  npx sunpeak test');
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

  p.log.step('Next steps:');
  p.log.message('  npm install -D sunpeak @playwright/test');
  p.log.message('  npx playwright install chromium');
  p.log.message('  npx sunpeak test');
}

async function initSunpeakProject() {
  p.log.info('Detected sunpeak project. Updating config to use defineConfig().');

  const cwd = process.cwd();
  const configPath = join(cwd, 'playwright.config.ts');

  if (existsSync(configPath)) {
    const content = readFileSync(configPath, 'utf-8');
    if (content.includes('sunpeak/test/config')) {
      p.log.info('Config already uses sunpeak/test/config. Nothing to do.');
      return;
    }
  }

  writeFileSync(
    configPath,
    `import { defineConfig } from 'sunpeak/test/config';

export default defineConfig();
`
  );

  p.log.success('Updated playwright.config.ts to use defineConfig()');
  p.log.step('Migrate test files:');
  p.log.message('  Replace: import { test, expect } from "@playwright/test"');
  p.log.message('  With:    import { test, expect } from "sunpeak/test"');
  p.log.message('');
  p.log.message('  Use the `mcp` fixture instead of raw page navigation.');
  p.log.message('  See sunpeak docs for migration examples.');
}
