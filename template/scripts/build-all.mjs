#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, rmSync, readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../dist/chatgpt');
const buildDir = path.join(__dirname, '../dist/build-output');
const tempDir = path.join(__dirname, '../.tmp');
const resourcesDir = path.join(__dirname, '../src/components/resources');
const templateFile = path.join(__dirname, '../src/index-resource.tsx');

// Clean dist and temp directories
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true });
}
if (existsSync(tempDir)) {
  rmSync(tempDir, { recursive: true });
}
mkdirSync(distDir, { recursive: true });
mkdirSync(tempDir, { recursive: true });

// Auto-discover all resources
const resourceFiles = readdirSync(resourcesDir)
  .filter(file => file.endsWith('-resource.tsx'))
  .map(file => {
    // Extract kebab-case name: 'counter-resource.tsx' -> 'counter'
    const kebabName = file.replace('-resource.tsx', '');

    // Convert kebab-case to PascalCase: 'counter' -> 'Counter', 'my-widget' -> 'MyWidget'
    const pascalName = kebabName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    return {
      componentName: `${pascalName}Resource`,
      componentFile: file.replace('.tsx', ''),
      entry: `.tmp/index-${kebabName}.tsx`,
      output: `${kebabName}.js`,
      buildOutDir: path.join(buildDir, kebabName),
    };
  });

console.log('Building all resources...\n');

// Read the template
const template = readFileSync(templateFile, 'utf-8');

// Build all resources (but don't copy yet)
resourceFiles.forEach(({ componentName, componentFile, entry, output, buildOutDir }, index) => {
  console.log(`[${index + 1}/${resourceFiles.length}] Building ${output}...`);

  try {
    // Create build directory if it doesn't exist
    if (!existsSync(buildOutDir)) {
      mkdirSync(buildOutDir, { recursive: true });
    }

    // Create entry file from template in temp directory
    const entryContent = template
      .replace('// RESOURCE_IMPORT', `import { ${componentName} } from '../src/components/resources/${componentFile}';`)
      .replace('// RESOURCE_MOUNT', `createRoot(root).render(<${componentName} />);`);

    const entryPath = path.join(__dirname, '..', entry);
    writeFileSync(entryPath, entryContent);

    // Build with vite to build directory
    execSync(
      `vite build --config vite.config.build.ts`,
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          ENTRY_FILE: entry,
          OUTPUT_FILE: output,
          OUT_DIR: buildOutDir,
        },
      }
    );
  } catch (error) {
    console.error(`Failed to build ${output}`);
    process.exit(1);
  }
});

// Now copy all files from build-output to dist/chatgpt
console.log('\nCopying built files to dist/chatgpt...');
resourceFiles.forEach(({ output, buildOutDir }) => {
  const builtFile = path.join(buildOutDir, output);
  const destFile = path.join(distDir, output);

  if (existsSync(builtFile)) {
    copyFileSync(builtFile, destFile);
    console.log(`✓ Copied ${output}`);
  } else {
    console.error(`Built file not found: ${builtFile}`);
    if (existsSync(buildOutDir)) {
      console.log(`  Files in ${buildOutDir}:`, readdirSync(buildOutDir));
    } else {
      console.log(`  Build directory doesn't exist: ${buildOutDir}`);
    }
    process.exit(1);
  }
});

// Clean up temp and build directories
if (existsSync(tempDir)) {
  rmSync(tempDir, { recursive: true });
}
if (existsSync(buildDir)) {
  rmSync(buildDir, { recursive: true });
}

console.log('\n✓ All resources built successfully!');
console.log(`\nBuilt files:`, readdirSync(distDir));
