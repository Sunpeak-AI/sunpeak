#!/usr/bin/env node
import { build as viteBuild } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, rmSync, readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, unlinkSync } from 'fs';
import path from 'path';

/**
 * Build all resources for a Sunpeak project
 * Runs in the context of a user's project directory
 */
export async function build(projectRoot = process.cwd()) {

  // Check for package.json first
  const pkgJsonPath = path.join(projectRoot, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    console.error('Error: No package.json found in current directory');
    console.error('Make sure you are in a Sunpeak project directory');
    process.exit(1);
  }

  // Check if we're in the sunpeak workspace (directory is named "template")
  const isTemplate = path.basename(projectRoot) === 'template';
  const parentSrc = path.resolve(projectRoot, '../src');

  const distDir = path.join(projectRoot, 'dist');
  const buildDir = path.join(projectRoot, 'dist/build-output');
  const tempDir = path.join(projectRoot, '.tmp');
  const resourcesDir = path.join(projectRoot, 'src/resources');
  const templateFile = path.join(projectRoot, 'src/index-resource.tsx');

  // Validate project structure
  if (!existsSync(resourcesDir)) {
    console.error('Error: src/resources directory not found');
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

  // Plugin factory to inline CSS into the JS bundle for all output files
  const inlineCssPlugin = (buildOutDir) => ({
    name: 'inline-css',
    closeBundle() {
      const cssFile = path.join(buildOutDir, 'style.css');

      if (existsSync(cssFile)) {
        const css = readFileSync(cssFile, 'utf-8');
        const injectCss = `(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);})();`;

        // Find all .js files in the dist directory and inject CSS
        const files = readdirSync(buildOutDir);
        files.forEach((file) => {
          if (file.endsWith('.js')) {
            const jsFile = path.join(buildOutDir, file);
            const js = readFileSync(jsFile, 'utf-8');
            writeFileSync(jsFile, injectCss + js);
          }
        });

        // Remove the separate CSS file after injecting into all bundles
        unlinkSync(cssFile);
      }
    },
  });

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
      // Extract kebab-case name: 'review-resource.tsx' -> 'review'
      const kebabName = file.replace('-resource.tsx', '');

      // Convert kebab-case to PascalCase: 'review' -> 'Review', 'my-widget' -> 'MyWidget'
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
    console.error('Error: No resource files found in src/resources/');
    console.error('Resource files should be named like: review-resource.tsx');
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
  for (let i = 0; i < resourceFiles.length; i++) {
    const { componentName, componentFile, entry, output, buildOutDir } = resourceFiles[i];
    console.log(`[${i + 1}/${resourceFiles.length}] Building ${output}...`);

    try {
      // Create build directory if it doesn't exist
      if (!existsSync(buildOutDir)) {
        mkdirSync(buildOutDir, { recursive: true });
      }

      // Create entry file from template in temp directory
      const entryContent = template
        .replace('// RESOURCE_IMPORT', `import { ${componentName} } from '../src/resources/${componentFile}';`)
        .replace('// RESOURCE_MOUNT', `createRoot(root).render(<${componentName} />);`);

      const entryPath = path.join(projectRoot, entry);
      writeFileSync(entryPath, entryContent);

      // Build with vite programmatically
      await viteBuild({
        root: projectRoot,
        plugins: [react(), tailwindcss(), inlineCssPlugin(buildOutDir)],
        define: {
          'process.env.NODE_ENV': JSON.stringify('production'),
        },
        resolve: {
          conditions: ['style', 'import', 'module', 'browser', 'default'],
          alias: {
            // In workspace dev mode, use local sunpeak source
            ...(isTemplate && {
              sunpeak: parentSrc,
            }),
          },
        },
        build: {
          target: 'es2020',
          outDir: buildOutDir,
          emptyOutDir: true,
          cssCodeSplit: false,
          lib: {
            entry: entryPath,
            name: 'SunpeakApp',
            formats: ['iife'],
            fileName: () => output,
          },
          rollupOptions: {
            output: {
              inlineDynamicImports: true,
              assetFileNames: 'style.css',
            },
          },
          minify: true,
          cssMinify: true,
        },
      });
    } catch (error) {
      console.error(`Failed to build ${output}`);
      console.error(error);
      process.exit(1);
    }
  }

  // Now copy all files from build-output to dist/
  console.log('\nCopying built files to dist/...');
  for (const { output, buildOutDir } of resourceFiles) {
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
  }

  // Generate resource metadata JSON files with URIs
  console.log('\nGenerating resource metadata JSON files...');
  const timestamp = Date.now().toString(36);
  for (const { componentFile } of resourceFiles) {
    const kebabName = componentFile.replace('-resource', '');
    const srcJson = path.join(resourcesDir, `${componentFile}.json`);
    const destJson = path.join(distDir, `${kebabName}.json`);

    if (existsSync(srcJson)) {
      const meta = JSON.parse(readFileSync(srcJson, 'utf-8'));
      // Generate URI using resource name and build timestamp
      meta.uri = `ui://${meta.name}-${timestamp}`;
      writeFileSync(destJson, JSON.stringify(meta, null, 2));
      console.log(`✓ Generated ${kebabName}.json (uri: ${meta.uri})`);
    }
  }

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
