#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, rmSync, readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import path from 'path';
import { detectPackageManager } from '../utils.mjs';

/**
 * Build all resources for a Sunpeak project
 * Runs in the context of a user's project directory
 */
export async function build(projectRoot = process.cwd()) {
  const pm = detectPackageManager(projectRoot);

  // Check for package.json first
  const pkgJsonPath = path.join(projectRoot, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    console.error('Error: No package.json found in current directory');
    console.error('Make sure you are in a Sunpeak project directory');
    process.exit(1);
  }

  const distDir = path.join(projectRoot, 'dist/chatgpt');
  const buildDir = path.join(projectRoot, 'dist/build-output');
  const tempDir = path.join(projectRoot, '.tmp');
  const resourcesDir = path.join(projectRoot, 'src/components/resources');
  const templateFile = path.join(projectRoot, 'src/index-resource.tsx');
  const viteConfigFile = path.join(projectRoot, 'vite.config.build.ts');

  // Validate project structure
  if (!existsSync(resourcesDir)) {
    console.error('Error: src/components/resources directory not found');
    console.error('Expected location: ' + resourcesDir);
    console.error('\nThe build command expects the standard Sunpeak project structure.');
    console.error('If you have customized your project structure, you may need to use');
    console.error('a custom build script instead of "sunpeak build".');
    process.exit(1);
  }

  if (!existsSync(templateFile)) {
    console.error('Error: src/index-resource.tsx not found');
    console.error('Expected location: ' + templateFile);
    console.error('\nThis file is the template entry point for building resources.');
    console.error('If you have moved or renamed it, you may need to use a custom build script.');
    process.exit(1);
  }

  if (!existsSync(viteConfigFile)) {
    console.error('Error: vite.config.build.ts not found');
    console.error('Expected location: ' + viteConfigFile);
    console.error('\nThis Vite config is required for building resources.');
    console.error('If you have renamed it, you may need to use a custom build script.');
    process.exit(1);
  }

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

  if (resourceFiles.length === 0) {
    console.error('Error: No resource files found in src/components/resources/');
    console.error('Resource files should be named like: counter-resource.tsx');
    process.exit(1);
  }

  console.log('Building all resources...\n');

  // Read and validate the template
  const template = readFileSync(templateFile, 'utf-8');

  // Verify template has required placeholders
  if (!template.includes('// RESOURCE_IMPORT')) {
    console.error('Error: src/index-resource.tsx is missing "// RESOURCE_IMPORT" placeholder');
    console.error('\nThe template file must include this comment where the resource import should go.');
    console.error('If you have customized this file, ensure it has the required placeholders.');
    process.exit(1);
  }

  if (!template.includes('// RESOURCE_MOUNT')) {
    console.error('Error: src/index-resource.tsx is missing "// RESOURCE_MOUNT" placeholder');
    console.error('\nThe template file must include this comment where the resource mount should go.');
    console.error('If you have customized this file, ensure it has the required placeholders.');
    process.exit(1);
  }

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

      const entryPath = path.join(projectRoot, entry);
      writeFileSync(entryPath, entryContent);

      // Build with vite to build directory
      const viteCommand = pm === 'npm' ? 'npx vite' : `${pm} exec vite`;
      execSync(
        `${viteCommand} build --config vite.config.build.ts`,
        {
          cwd: projectRoot,
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
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  build().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
