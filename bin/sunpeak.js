#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const command = args[0];
const projectName = args[1];

if (command !== 'init' || !projectName) {
  console.error('Usage: sunpeak init <project-name>');
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), projectName);

if (fs.existsSync(targetDir)) {
  console.error(`Error: Directory "${projectName}" already exists.`);
  process.exit(1);
}

console.log(`☀️🏔️ Creating sunpeak app in ${targetDir}...`);

const templateDir = path.resolve(__dirname, '../template');

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const files = fs.readdirSync(src);
    for (const file of files) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    let content = fs.readFileSync(src, 'utf-8');
    content = content.replace(/\{\{NAME\}\}/g, projectName);
    fs.writeFileSync(dest, content);
  }
}

copyRecursive(templateDir, targetDir);

console.log(`
✅ Project created successfully!

Next steps:
  cd ${projectName}
  pnpm install
  pnpm dev

Happy building! 🚀
`);
