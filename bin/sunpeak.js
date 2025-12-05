#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_DIR = join(__dirname, '..', 'cli');

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function runCommand(command, args = [], options = {}) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
    ...options,
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

function checkPackageJson() {
  const pkgPath = join(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) {
    console.error('Error: No package.json found in current directory.');
    console.error('Make sure you are in a Sunpeak project directory.');
    process.exit(1);
  }
}

async function init(projectName) {
  if (!projectName) {
    projectName = await prompt('☀️ 🏔️ Project name [my-app]: ');
    if (!projectName) {
      projectName = 'my-app';
    }
  }

  if (projectName === 'template') {
    console.error('Error: "template" is a reserved name. Please choose another name.');
    process.exit(1);
  }

  const targetDir = join(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    console.error(`Error: Directory "${projectName}" already exists`);
    process.exit(1);
  }

  const templateDir = join(__dirname, '..', 'template');

  console.log(`☀️ 🏔️ Creating ${projectName}...`);

  mkdirSync(targetDir, { recursive: true });

  cpSync(templateDir, targetDir, {
    recursive: true,
    filter: (src) => {
      const name = basename(src);
      return name !== 'node_modules' && name !== 'pnpm-lock.yaml';
    },
  });

  // Rename underscore-prefixed files to dotfiles
  const dotfiles = ['_gitignore', '_prettierignore', '_prettierrc'];
  for (const file of dotfiles) {
    const srcPath = join(targetDir, file);
    const destPath = join(targetDir, file.replace(/^_/, '.'));
    if (existsSync(srcPath)) {
      renameSync(srcPath, destPath);
    }
  }

  // Read sunpeak version from root package.json
  const rootPkgPath = join(__dirname, '..', 'package.json');
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
  const sunpeakVersion = `^${rootPkg.version}`;

  // Update project package.json
  const pkgPath = join(targetDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.name = projectName;

  // Replace workspace:* with actual version
  if (pkg.dependencies?.sunpeak === 'workspace:*') {
    pkg.dependencies.sunpeak = sunpeakVersion;
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  console.log(`
Done! To get started:

  # Install the CLI (if not already installed)
  pnpm add -g sunpeak

  # Navigate to your project and install dependencies
  cd ${projectName}
  pnpm install

  # Start development
  sunpeak dev

Alternatively, use "pnpm dlx sunpeak dev" if you prefer not to install globally.

See README.md for more details.
`);
}

const [, , command, ...args] = process.argv;

// Main CLI handler
(async () => {
  // Commands that don't require a package.json
  const standaloneCommands = ['new', 'help', undefined];

  if (command && !standaloneCommands.includes(command)) {
    checkPackageJson();
  }

  switch (command) {
    case 'new':
      await init(args[0]);
      break;

    case 'dev':
      runCommand('pnpm', ['dev', ...args]);
      break;

    case 'build':
      {
        const { build } = await import(join(CLI_DIR, 'build.mjs'));
        await build(process.cwd());
      }
      break;

    case 'mcp':
    case 'mcp:serve':
      if (command === 'mcp:serve' || args[0] === 'serve' || args[0] === ':serve') {
        runCommand('pnpm', ['mcp:serve', ...(command === 'mcp:serve' ? args : args.slice(1))]);
      } else {
        runCommand('pnpm', ['mcp', ...args]);
      }
      break;

    case 'lint':
      runCommand('pnpm', ['lint', ...args]);
      break;

    case 'typecheck':
      runCommand('pnpm', ['typecheck', ...args]);
      break;

    case 'test':
      runCommand('pnpm', ['test', ...args]);
      break;

    case 'format':
      runCommand('pnpm', ['format', ...args]);
      break;

    case 'validate':
      {
        const { validate } = await import(join(CLI_DIR, 'validate.mjs'));
        await validate(process.cwd());
      }
      break;

    case 'help':
    case undefined:
      console.log(`
☀️ 🏔️ sunpeak - The MCP App SDK

Usage:
  sunpeak <command> [options]

Commands:
  new [name]       Create a new project from template
  dev              Start the development server
  build            Build all resources for production
  mcp              Run the MCP server with nodemon
  mcp:serve        Run the MCP server directly
  lint             Run ESLint to check code quality
  typecheck        Run TypeScript type checking
  test             Run tests with Vitest
  format           Format code with Prettier
  validate         Run full validation suite
  help             Show this help message

Examples:
  sunpeak new my-app
  sunpeak dev
  sunpeak build
  sunpeak mcp

For more information, visit: https://sunpeak.ai/
`);
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
