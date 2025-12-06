#!/usr/bin/env node
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { detectPackageManager } from '../utils.mjs';

/**
 * Start the Vite development server
 * Runs in the context of a user's project directory
 */
export async function dev(projectRoot = process.cwd(), args = []) {
  const pm = detectPackageManager(projectRoot);

  // Check for package.json
  const pkgJsonPath = join(projectRoot, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    console.error('Error: No package.json found in current directory');
    console.error('Make sure you are in a Sunpeak project directory');
    process.exit(1);
  }

  // Parse port from args or use default
  let port = process.env.PORT || '6767';
  const portArgIndex = args.findIndex(arg => arg === '--port' || arg === '-p');
  if (portArgIndex !== -1 && args[portArgIndex + 1]) {
    port = args[portArgIndex + 1];
  }

  // Build vite command
  const viteCommand = pm === 'npm' ? 'npx' : pm;
  const viteArgs = pm === 'npm' ? ['vite'] : ['exec', 'vite'];

  // Add port
  viteArgs.push('--port', port);

  // Add any additional args (filtering out port if already handled)
  const additionalArgs = portArgIndex !== -1
    ? [...args.slice(0, portArgIndex), ...args.slice(portArgIndex + 2)]
    : args;
  viteArgs.push(...additionalArgs);

  console.log(`Starting Vite dev server on port ${port}...`);

  // Spawn vite process
  const child = spawn(viteCommand, viteArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: port,
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
  dev(process.cwd(), args).catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
