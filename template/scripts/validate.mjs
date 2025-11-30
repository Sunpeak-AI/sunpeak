#!/usr/bin/env node

/**
 * Local testing script for Sunpeak project.
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';

// Color codes for output
const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  blue: '\x1b[0;34m',
  yellow: '\x1b[1;33m',
  reset: '\x1b[0m',
};

// Get project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

function printSuccess(text) {
  console.log(`${colors.green}✓ ${text}${colors.reset}`);
}

function printError(text) {
  console.log(`${colors.red}✗ ${text}${colors.reset}`);
}

function runCommand(command, cwd) {
  try {
    execSync(command, {
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

// Main testing flow
console.log(`${colors.yellow}Starting local testing for Sunpeak project...${colors.reset}`);
console.log(`Project root: ${PROJECT_ROOT}\n`);

try {
  console.log('Running: pnpm install');
  if (!runCommand('pnpm install', PROJECT_ROOT)) {
    throw new Error('pnpm install failed');
  }
  console.log()
  printSuccess('pnpm install');

  console.log('\nRunning: pnpm format');
  if (!runCommand('pnpm format', PROJECT_ROOT)) {
    throw new Error('pnpm format failed');
  }
  printSuccess('pnpm format');

  console.log('\nRunning: pnpm lint');
  if (!runCommand('pnpm lint', PROJECT_ROOT)) {
    throw new Error('pnpm lint failed');
  }
  printSuccess('pnpm lint');

  console.log('\nRunning: pnpm typecheck');
  if (!runCommand('pnpm typecheck', PROJECT_ROOT)) {
    throw new Error('pnpm typecheck failed');
  }
  printSuccess('pnpm typecheck');

  console.log('\nRunning: pnpm test');
  if (!runCommand('pnpm test', PROJECT_ROOT)) {
    throw new Error('pnpm test failed');
  }
  printSuccess('pnpm test');

  console.log('\nRunning: pnpm build');
  if (!runCommand('pnpm build', PROJECT_ROOT)) {
    throw new Error('pnpm build failed');
  }
  const chatgptDir = join(PROJECT_ROOT, 'dist', 'chatgpt');
  const expectedFiles = ['counter.js', 'albums.js', 'carousel.js'];

  // Check all expected files exist
  for (const file of expectedFiles) {
    const filePath = join(chatgptDir, file);
    if (!existsSync(filePath)) {
      printError(`Missing expected file: ./dist/chatgpt/${file}`);
      process.exit(1);
    }
  }

  // Verify only expected files are present
  const files = readdirSync(chatgptDir);
  const unexpectedFiles = files.filter(f => !expectedFiles.includes(f));
  if (unexpectedFiles.length > 0) {
    printError(`Unexpected files in ./dist/chatgpt/: ${unexpectedFiles.join(', ')}`);
    printError(`Expected only: ${expectedFiles.join(', ')}`);
    process.exit(1);
  }

  console.log()
  printSuccess('pnpm build');

  // MCP Server Check
  console.log('\nRunning: pnpm mcp:serve');
  const mcpProcess = spawn('pnpm', ['mcp:serve'], {
    cwd: PROJECT_ROOT,
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
  printSuccess('pnpm mcp\n');

  printSuccess('All systems GO!\n\n');
  process.exit(0);
} catch (error) {
  console.error(`\n${colors.red}Error: ${error.message}${colors.reset}\n`);
  process.exit(1);
}
