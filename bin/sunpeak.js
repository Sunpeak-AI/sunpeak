#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
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
  pnpm install && pnpm dev

See README.md for more details.
`);
}

const [, , command, ...args] = process.argv;

if (command === 'new') {
  init(args[0]);
} else {
  console.log(`
sunpeak - The MCP App SDK

Commands:
  new [name]  Create a new project from template
`);
}
