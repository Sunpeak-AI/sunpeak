#!/usr/bin/env node
import { existsSync, rmSync, readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, unlinkSync } from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { toPascalCase } from '../lib/patterns.mjs';
import { extractResourceExport } from '../lib/extract-resource.mjs';

/**
 * Resolve the ESM entry point for a package from a specific project directory.
 * This avoids the CJS deprecation warning from packages like Vite.
 */
function resolveEsmEntry(require, packageName) {
  // First resolve to find where the package is located
  const resolvedPath = require.resolve(packageName);

  // Walk up to find the package's package.json
  let dir = path.dirname(resolvedPath);
  while (dir !== path.dirname(dir)) {
    const pkgJsonPath = path.join(dir, 'package.json');
    if (existsSync(pkgJsonPath)) {
      const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      if (pkg.name === packageName) {
        // Found the package.json, look for ESM entry in exports
        const exports = pkg.exports;
        if (exports?.['.']?.import) {
          const importEntry = exports['.'].import;
          // Handle nested conditions like { types, default }
          const esmPath = typeof importEntry === 'string' ? importEntry : importEntry.default;
          if (esmPath) {
            return pathToFileURL(path.join(dir, esmPath)).href;
          }
        }
        // Fallback to module field
        if (pkg.module) {
          return pathToFileURL(path.join(dir, pkg.module)).href;
        }
        break;
      }
    }
    dir = path.dirname(dir);
  }

  // Fallback to resolved path (may be CJS)
  return pathToFileURL(resolvedPath).href;
}

/**
 * Build all resources for a Sunpeak project
 * Runs in the context of a user's project directory
 */
export async function build(projectRoot = process.cwd(), { quiet = false } = {}) {
  const log = quiet ? () => {} : console.log.bind(console);

  // Check for package.json first
  const pkgJsonPath = path.join(projectRoot, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    console.error('Error: No package.json found in current directory');
    console.error('Make sure you are in a Sunpeak project directory');
    process.exit(1);
  }

  // Read project identity from package.json for appInfo
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  const appName = pkg.name || 'sunpeak-app';
  const appVersion = pkg.version || '0.1.0';

  // Check if we're in the sunpeak workspace (directory is named "template")
  const isTemplate = path.basename(projectRoot) === 'template';
  const parentSrc = path.resolve(projectRoot, '../src');

  const distDir = path.join(projectRoot, 'dist');
  const buildDir = path.join(projectRoot, 'dist/build-output');
  const tempDir = path.join(projectRoot, '.tmp');
  const resourcesDir = path.join(projectRoot, 'src/resources');
  const templateFile = path.join(projectRoot, 'src/index-resource.tsx');

  // Check if resources exist (optional — projects may have only plain tools)
  const hasResources = existsSync(resourcesDir);
  const hasTemplateFile = existsSync(templateFile);

  if (hasResources && !hasTemplateFile) {
    console.error('Error: src/index-resource.tsx not found');
    console.error('Expected location: ' + templateFile);
    console.error('\nThis file is the template entry point for building resources.');
    console.error('If you have moved or renamed it, you may need to use a custom build script.');
    process.exit(1);
  }

  const require = createRequire(path.join(projectRoot, 'package.json'));

  // Clean dist and temp directories
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true });
  }
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true });
  }
  mkdirSync(distDir, { recursive: true });

  // ========================================================================
  // Build resources (if any exist)
  // ========================================================================

  let resourceFiles = [];

  if (hasResources && hasTemplateFile) {
    // Import vite and plugins from the user's project (not from sunpeak's node_modules)
    // We resolve to ESM entry points to avoid the CJS deprecation warning from Vite
    let viteBuild, react, tailwindcss;
    try {
      const [viteModule, reactModule, tailwindModule] = await Promise.all([
        import(resolveEsmEntry(require, 'vite')),
        import(resolveEsmEntry(require, '@vitejs/plugin-react')),
        import(resolveEsmEntry(require, '@tailwindcss/vite')),
      ]);
      viteBuild = viteModule.build;
      react = reactModule.default;
      tailwindcss = tailwindModule.default;
    } catch (error) {
      console.error('Error: Could not load build dependencies from your project.');
      console.error('\nMake sure you have these packages installed in your project:');
      console.error('  - vite');
      console.error('  - @vitejs/plugin-react');
      console.error('  - @tailwindcss/vite');
      console.error('\nRun: npm install -D vite @vitejs/plugin-react @tailwindcss/vite');
      console.error('\nOriginal error:', error.message);
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

    mkdirSync(tempDir, { recursive: true });

    // Auto-discover all resources (each resource is a subdirectory)
    resourceFiles = readdirSync(resourcesDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => {
        const kebabName = entry.name;

        const resourceFile = `${kebabName}.tsx`;
        const resourcePath = path.join(resourcesDir, kebabName, resourceFile);

        // Skip directories without a resource file
        if (!existsSync(resourcePath)) {
          return null;
        }

        // Convert kebab-case to PascalCase: 'review' -> 'Review', 'my-widget' -> 'MyWidget'
        const pascalName = toPascalCase(kebabName);
        const componentFile = resourceFile.replace(/\.tsx$/, '');

        return {
          componentName: `${pascalName}Resource`,
          componentFile,
          kebabName,
          resourceDir: path.join(resourcesDir, kebabName),
          entry: `.tmp/index-${kebabName}.tsx`,
          jsOutput: `${kebabName}.js`,
          htmlOutput: `${kebabName}.html`,
          buildOutDir: path.join(buildDir, kebabName),
          distOutDir: path.join(distDir, kebabName),  // Final output: dist/{resource}/
        };
      })
      .filter(Boolean);

    if (resourceFiles.length > 0) {
      log('Building all resources...\n');

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
        const { componentName, componentFile, kebabName, entry, jsOutput, buildOutDir } = resourceFiles[i];
        log(`[${i + 1}/${resourceFiles.length}] Building ${kebabName}...`);

        try {
          // Create build directory if it doesn't exist
          if (!existsSync(buildOutDir)) {
            mkdirSync(buildOutDir, { recursive: true });
          }

          // Create entry file from template in temp directory
          const entryContent = template
            .replace('// RESOURCE_IMPORT', `import { ${componentName}, resource } from '../src/resources/${kebabName}/${componentFile}';`)
            .replace('// RESOURCE_MOUNT', `createRoot(root).render(<AppProvider appInfo={{ name: ${JSON.stringify(appName)}, version: ${JSON.stringify(appVersion)} }}><${componentName} /></AppProvider>);`);

          const entryPath = path.join(projectRoot, entry);
          writeFileSync(entryPath, entryContent);

          // Build with vite programmatically
          await viteBuild({
            mode: 'production',
            root: projectRoot,
            ...(quiet && { logLevel: 'silent' }),
            plugins: [react(), tailwindcss(), inlineCssPlugin(buildOutDir)],
            define: {
              'process.env.NODE_ENV': JSON.stringify('production'),
            },
            resolve: {
              conditions: ['style', 'import', 'module', 'browser', 'default'],
              alias: {
                '@': path.resolve(projectRoot, 'src'),
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
                fileName: () => jsOutput,
              },
              rollupOptions: {
                output: {
                  assetFileNames: 'style.css',
                },
              },
              minify: true,
              cssMinify: true,
            },
          });
        } catch (error) {
          console.error(`Failed to build ${kebabName}`);
          console.error(error);
          process.exit(1);
        }
      }

      // Now copy all files from build-output to dist/{resource}/
      log('\nCopying built files to dist/...');
      const timestamp = Date.now().toString(36);

      for (const { jsOutput, htmlOutput, buildOutDir, distOutDir, kebabName, componentFile, resourceDir } of resourceFiles) {
        // Create resource-specific output directory
        if (!existsSync(distOutDir)) {
          mkdirSync(distOutDir, { recursive: true });
        }

        // Extract resource metadata from .tsx file and write as JSON
        const srcTsx = path.join(resourceDir, `${componentFile}.tsx`);
        const destJson = path.join(distOutDir, `${kebabName}.json`);

        const meta = await extractResourceExport(srcTsx);
        // Inject name from directory key if not explicitly set
        meta.name = meta.name ?? kebabName;
        // Generate URI using resource name and build timestamp
        meta.uri = `ui://${meta.name}-${timestamp}`;
        writeFileSync(destJson, JSON.stringify(meta, null, 2));
        log(`✓ Generated ${kebabName}/${kebabName}.json (uri: ${meta.uri})`);

        // Read built JS file and wrap in HTML shell
        const builtJsFile = path.join(buildOutDir, jsOutput);
        const destHtmlFile = path.join(distOutDir, htmlOutput);

        if (existsSync(builtJsFile)) {
          const jsContents = readFileSync(builtJsFile, 'utf-8');
          const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <div id="root"></div>
  <script>
${jsContents}
  </script>
</body>
</html>`;
          writeFileSync(destHtmlFile, html);
          log(`✓ Built ${kebabName}/${htmlOutput}`);
        } else {
          console.error(`Built file not found: ${builtJsFile}`);
          if (existsSync(buildOutDir)) {
            log(`  Files in ${buildOutDir}:`, readdirSync(buildOutDir));
          } else {
            log(`  Build directory doesn't exist: ${buildOutDir}`);
          }
          process.exit(1);
        }

      }

      // Clean up temp and build directories
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true });
      }
      if (existsSync(buildDir)) {
        rmSync(buildDir, { recursive: true });
      }

      log('\n✓ All resources built successfully!');
      log('\nBuilt resources:');
      for (const { kebabName } of resourceFiles) {
        log(`  ${kebabName}`);
      }
    }
  }

  // ========================================================================
  // Compile server-side code (tools + server entry) for `sunpeak start`
  // ========================================================================

  const toolsDir = path.join(projectRoot, 'src/tools');
  const serverEntryPath = path.join(projectRoot, 'src/server.ts');

  // Find tool files
  const toolFiles = existsSync(toolsDir)
    ? readdirSync(toolsDir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    : [];

  const hasServerEntry = existsSync(serverEntryPath);

  if (toolFiles.length > 0 || hasServerEntry) {
    log('\nCompiling server-side code...');

    let esbuild;
    try {
      const esbuildPath = resolveEsmEntry(require, 'esbuild');
      esbuild = await import(esbuildPath);
    } catch {
      console.warn('Warning: esbuild not found — skipping tool/server compilation.');
      console.warn('Install esbuild to enable `sunpeak start`: npm install -D esbuild');
      esbuild = null;
    }

    if (esbuild) {
      const toolsOutDir = path.join(distDir, 'tools');
      if (toolFiles.length > 0) {
        mkdirSync(toolsOutDir, { recursive: true });
      }

      // Compile each tool file
      for (const toolFile of toolFiles) {
        const toolName = toolFile.replace(/\.ts$/, '');
        const toolPath = path.join(toolsDir, toolFile);

        try {
          await esbuild.build({
            entryPoints: [toolPath],
            bundle: true,
            format: 'esm',
            platform: 'node',
            target: 'node18',
            outfile: path.join(toolsOutDir, `${toolName}.js`),
            // Externalize bare specifiers (node_modules) — resolve at runtime
            plugins: [{
              name: 'externalize-bare-specifiers',
              setup(build) {
                build.onResolve({ filter: /.*/ }, (args) => {
                  if (args.kind !== 'import-statement') return;
                  if (!args.path.startsWith('.') && !args.path.startsWith('/')) {
                    return { external: true };
                  }
                  return undefined;
                });
              },
            }],
            loader: { '.tsx': 'tsx', '.ts': 'ts' },
            logLevel: 'warning',
          });
          log(`✓ Compiled tools/${toolName}.js`);
        } catch (err) {
          console.error(`Failed to compile tool ${toolName}:`, err.message);
          process.exit(1);
        }
      }

      // Compile server entry if present
      if (hasServerEntry) {
        try {
          await esbuild.build({
            entryPoints: [serverEntryPath],
            bundle: true,
            format: 'esm',
            platform: 'node',
            target: 'node18',
            outfile: path.join(distDir, 'server.js'),
            plugins: [{
              name: 'externalize-bare-specifiers',
              setup(build) {
                build.onResolve({ filter: /.*/ }, (args) => {
                  if (args.kind !== 'import-statement') return;
                  if (!args.path.startsWith('.') && !args.path.startsWith('/')) {
                    return { external: true };
                  }
                  return undefined;
                });
              },
            }],
            loader: { '.tsx': 'tsx', '.ts': 'ts' },
            logLevel: 'warning',
          });
          log(`✓ Compiled server.js`);
        } catch (err) {
          console.error(`Failed to compile server entry:`, err.message);
          process.exit(1);
        }
      }
    }
  }

  log('\n✓ Build complete!');
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const quiet = process.argv.includes('--quiet');
  build(process.cwd(), { quiet }).catch(error => {
    console.error(error);
    process.exit(1);
  });
}
