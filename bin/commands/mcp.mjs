#!/usr/bin/env node
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { detectPackageManager } from '../utils.mjs';

/**
 * Start the MCP server with auto-reload
 * Runs in the context of a user's project directory
 */
export async function mcp(projectRoot = process.cwd(), args = []) {
  const pm = detectPackageManager(projectRoot);

  // Check for package.json
  const pkgJsonPath = join(projectRoot, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    console.error('Error: No package.json found in current directory');
    console.error('Make sure you are in a Sunpeak project directory');
    process.exit(1);
  }

  console.log('Starting MCP server with auto-reload...');
  console.log('Watching src/ for changes...\n');

  // Build nodemon command
  const nodemonCommand = pm === 'npm' ? 'npx' : pm;
  const nodemonArgs = pm === 'npm' ? ['nodemon'] : ['exec', 'nodemon'];

  // Add inline nodemon configuration
  nodemonArgs.push(
    '--watch', 'src',
    '--ext', 'ts,tsx,js,jsx,css',
    '--ignore', 'dist',
    '--ignore', 'node_modules',
    '--ignore', '.tmp',
    '--delay', '500ms',
    '--exec', 'sunpeak build && tsx node_modules/sunpeak/dist/mcp/entry.js'
  );

  // Add any additional args
  nodemonArgs.push(...args);

  // Spawn nodemon process
  const child = spawn(nodemonCommand, nodemonArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      FORCE_COLOR: '1',
    },
  });

  // Forward signals
  process.on('SIGINT', () => {
    child.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
    process.exit(0);
  });

  // Handle child exit
  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  mcp(process.cwd(), args).catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
