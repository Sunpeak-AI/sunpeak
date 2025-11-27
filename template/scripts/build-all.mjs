#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../dist/chatgpt');

// Clean dist directory
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true });
}

const tools = [
  { entry: 'src/index-counter.tsx', output: 'counter.js' },
  { entry: 'src/index-albums.tsx', output: 'albums.js' },
  { entry: 'src/index-carousel.tsx', output: 'carousel.js' },
];

console.log('Building all tools...\n');

tools.forEach(({ entry, output }, index) => {
  console.log(`[${index + 1}/${tools.length}] Building ${output}...`);
  try {
    execSync(
      `vite build --config vite.config.build.ts`,
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          ENTRY_FILE: entry,
          OUTPUT_FILE: output,
        },
      }
    );
  } catch (error) {
    console.error(`Failed to build ${output}`);
    process.exit(1);
  }
});

console.log('\n✓ All tools built successfully!');
