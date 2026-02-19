#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { discoverResources } from './lib/patterns.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = join(__dirname, 'commands');

function checkPackageJson() {
  const pkgPath = join(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) {
    console.error('Error: No package.json found in current directory.');
    console.error('Make sure you are in a Sunpeak project directory.');
    process.exit(1);
  }
}

const [, , command, ...args] = process.argv;

/**
 * Get the sunpeak version from package.json
 */
function getVersion() {
  const pkgPath = join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  return pkg.version;
}

// Main CLI handler
(async () => {
  // Handle --version / -v flags early
  if (command === '--version' || command === '-v' || command === 'version') {
    console.log(getVersion());
    process.exit(0);
  }

  // Commands that don't require a package.json
  const standaloneCommands = ['new', 'upgrade', 'help', undefined];

  if (command && !standaloneCommands.includes(command)) {
    checkPackageJson();
  }

  switch (command) {
    case 'new':
      {
        const { init } = await import(join(COMMANDS_DIR, 'new.mjs'));
        await init(args[0], args[1]);
      }
      break;

    case 'dev':
      {
        const { dev } = await import(join(COMMANDS_DIR, 'dev.mjs'));
        await dev(process.cwd(), args);
      }
      break;

    case 'build':
      {
        const { build } = await import(join(COMMANDS_DIR, 'build.mjs'));
        await build(process.cwd());
      }
      break;

    case 'upgrade':
      {
        const { upgrade } = await import(join(COMMANDS_DIR, 'upgrade.mjs'));
        const options = {
          check: args.includes('--check') || args.includes('-c'),
          help: args.includes('--help') || args.includes('-h'),
        };
        await upgrade(options);
      }
      break;

    case 'help':
    case undefined:
      {
        const resources = discoverResources();
        console.log(`
☀️ 🏔️ sunpeak - The ChatGPT App framework

Install:
  pnpm add -g sunpeak

Usage:
  sunpeak new [name] [resources]  Create a new project
  sunpeak dev              Start dev server + MCP endpoint
    --no-begging           Suppress GitHub star message
  sunpeak build            Build resources
  sunpeak upgrade          Upgrade sunpeak to latest version
  sunpeak --version        Show version number

  Resources: ${resources.join(', ')} (comma/space separated)
  Example: sunpeak new my-app "${resources.slice(0, 2).join(',')}"
`);
      }
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "sunpeak help" to see available commands.');
      process.exit(1);
  }
})().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
