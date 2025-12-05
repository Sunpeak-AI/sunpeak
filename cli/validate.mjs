#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import http from 'http';

/**
 * Validate a Sunpeak project by running all checks
 * Runs in the context of a user's project directory
 */

// Color codes for output
const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  blue: '\x1b[0;34m',
  yellow: '\x1b[1;33m',
  reset: '\x1b[0m',
};

function printSuccess(text) {
  console.log(`${colors.green}✓ ${text}${colors.reset}`);
}

function printError(text) {
  console.log(`${colors.red}✗ ${text}${colors.reset}`);
}

function printWarning(text) {
  console.log(`${colors.yellow}⚠ ${text}${colors.reset}`);
}

function detectPackageManager(projectRoot) {
  if (existsSync(join(projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(projectRoot, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(projectRoot, 'package-lock.json'))) return 'npm';
  return 'pnpm'; // default
}

function hasScript(projectRoot, scriptName) {
  try {
    const pkgJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
    return !!pkgJson.scripts?.[scriptName];
  } catch (error) {
    return false;
  }
}

function runCommand(command, cwd, pm = 'pnpm') {
  try {
    // Replace pnpm with detected package manager
    const actualCommand = command.replace(/^pnpm/, pm);
    execSync(actualCommand, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    return true;
  } catch (error) {
    return false;
  }
}

function waitForServer(port, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkServer = () => {
      const req = http.get(`http://localhost:${port}`, () => {
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Server did not start within ${timeout}ms`));
        } else {
          setTimeout(checkServer, 500);
        }
      });
      req.end();
    };
    checkServer();
  });
}

export async function validate(projectRoot = process.cwd()) {
  const pm = detectPackageManager(projectRoot);

  // Check package.json exists
  if (!existsSync(join(projectRoot, 'package.json'))) {
    console.error('Error: No package.json found in current directory');
    console.error('Make sure you are in a Sunpeak project directory');
    process.exit(1);
  }

  console.log(`${colors.yellow}Starting validation for Sunpeak project...${colors.reset}`);
  console.log(`Project root: ${projectRoot}`);
  console.log(`Package manager: ${pm}\n`);

  try {
    console.log(`Running: ${pm} install`);
    if (!runCommand(`${pm} install`, projectRoot, pm)) {
      throw new Error(`${pm} install failed`);
    }
    console.log()
    printSuccess(`${pm} install`);

    // Format (optional)
    if (hasScript(projectRoot, 'format')) {
      console.log(`\nRunning: ${pm} format`);
      if (!runCommand(`${pm} format`, projectRoot, pm)) {
        throw new Error(`${pm} format failed`);
      }
      printSuccess(`${pm} format`);
    } else {
      printWarning('Skipping format: no "format" script in package.json');
    }

    // Lint (optional)
    if (hasScript(projectRoot, 'lint')) {
      console.log(`\nRunning: ${pm} lint`);
      if (!runCommand(`${pm} lint`, projectRoot, pm)) {
        throw new Error(`${pm} lint failed`);
      }
      printSuccess(`${pm} lint`);
    } else {
      printWarning('Skipping lint: no "lint" script in package.json');
    }

    // Typecheck (optional)
    if (hasScript(projectRoot, 'typecheck')) {
      console.log(`\nRunning: ${pm} typecheck`);
      if (!runCommand(`${pm} typecheck`, projectRoot, pm)) {
        throw new Error(`${pm} typecheck failed`);
      }
      printSuccess(`${pm} typecheck`);
    } else {
      printWarning('Skipping typecheck: no "typecheck" script in package.json');
    }

    // Test (optional)
    if (hasScript(projectRoot, 'test')) {
      console.log(`\nRunning: ${pm} test`);
      if (!runCommand(`${pm} test`, projectRoot, pm)) {
        throw new Error(`${pm} test failed`);
      }
      printSuccess(`${pm} test`);
    } else {
      printWarning('Skipping test: no "test" script in package.json');
    }

    console.log(`\nRunning: sunpeak build`);
    // Import and run build directly
    const { build } = await import('./build.mjs');
    await build(projectRoot);

    const chatgptDir = join(projectRoot, 'dist', 'chatgpt');

    if (!existsSync(chatgptDir)) {
      printError('dist/chatgpt directory not found after build');
      process.exit(1);
    }

    const files = readdirSync(chatgptDir);
    if (files.length === 0) {
      printError('No files found in dist/chatgpt/');
      process.exit(1);
    }

    // Verify all files are .js files
    const nonJsFiles = files.filter(f => !f.endsWith('.js'));
    if (nonJsFiles.length > 0) {
      printError(`Unexpected non-JS files in ./dist/chatgpt/: ${nonJsFiles.join(', ')}`);
      process.exit(1);
    }

    console.log()
    printSuccess('sunpeak build');

    // MCP Server Check (optional)
    if (hasScript(projectRoot, 'mcp:serve')) {
      console.log(`\nRunning: ${pm} mcp:serve`);
      const mcpProcess = spawn(pm, ['mcp:serve'], {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '1' },
      });

      const mcpErrors = [];

      mcpProcess.stderr.on('data', (data) => {
        const message = data.toString();
        if (message.includes('error') || message.includes('Error')) {
          mcpErrors.push(message.trim());
        }
      });

      // Store process for cleanup
      process.on('exit', () => {
        if (mcpProcess && !mcpProcess.killed) {
          mcpProcess.kill();
        }
      });

      try {
        console.log('\nWaiting for MCP server to start on port 6766...');
        await waitForServer(6766, 10000);

        // Give it a moment to ensure no immediate errors
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (mcpErrors.length > 0) {
          printError('MCP server started but reported errors:');
          mcpErrors.forEach(err => console.log(`  ${err}`));
          throw new Error('MCP server has errors');
        }

      } catch (error) {
        printError(`MCP server failed to start: ${error.message}`);
        throw error;
      } finally {
        console.log('Stopping MCP server...');
        mcpProcess.kill();
        // Give it a moment to shut down
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log()
      printSuccess(`${pm} mcp\n`);
    } else {
      printWarning('Skipping MCP server check: no "mcp:serve" script in package.json\n');
    }

    printSuccess('All systems GO!\n\n');
    process.exit(0);
  } catch (error) {
    console.error(`\n${colors.red}Error: ${error.message}${colors.reset}\n`);
    process.exit(1);
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validate().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
