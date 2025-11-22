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
      projectName = 'my-app'
    }
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
    }
  });

  const pkgPath = join(targetDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.name = projectName;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  console.log(`
Done! To get started:

  cd ${projectName}
  pnpm install && pnpm dev

See README.md for more details.
`);
}

const [,, command, ...args] = process.argv;

if (command === 'init') {
  init(args[0]);
} else {
  console.log(`
sunpeak - ChatGPT Apps UI SDK

Commands:
  init [name]  Create a new project from template
`);
}
