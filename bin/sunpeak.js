#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = join(__dirname, 'commands');

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
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

  cd ${projectName}
  pnpm install
  pnpm dev

That's it! Your project commands:

  pnpm dev          # Start development server
  pnpm build        # Build for production
  pnpm mcp          # Start MCP server
  pnpm test         # Run tests

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

    case 'mcp':
      {
        const { mcp } = await import(join(COMMANDS_DIR, 'mcp.mjs'));
        await mcp(process.cwd(), args);
      }
      break;

    case 'help':
    case undefined:
      console.log(`
☀️ 🏔️ sunpeak - The MCP App SDK

Usage:
  npx sunpeak new [name]   Create a new project (no install needed)
  pnpm dlx sunpeak new     Alternative with pnpm

Inside your project, use npm scripts:
  pnpm dev                 Start development server
  pnpm build               Build for production
  pnpm mcp                 Start MCP server
  pnpm test                Run tests

Direct CLI commands (when sunpeak is installed):
  sunpeak new [name]       Create a new project
  sunpeak dev              Start dev server
  sunpeak build            Build resources
  sunpeak mcp              Start MCP server

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
