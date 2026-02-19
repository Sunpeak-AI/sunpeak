#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
const { existsSync, readFileSync } = fs;
const { join, resolve, basename, dirname } = path;
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

/**
 * Import a module from the project's node_modules using ESM resolution
 */
async function importFromProject(require, moduleName) {
  // Resolve the module's main entry to find its location
  const resolvedPath = require.resolve(moduleName);

  // Walk up to find package.json
  const { readFileSync } = await import('fs');
  let pkgDir = dirname(resolvedPath);
  let pkg;
  while (pkgDir !== dirname(pkgDir)) {
    try {
      const pkgJsonPath = join(pkgDir, 'package.json');
      pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      if (pkg.name === moduleName || moduleName.startsWith(pkg.name + '/')) {
        break;
      }
    } catch {
      // No package.json at this level, keep looking
    }
    pkgDir = dirname(pkgDir);
  }

  if (!pkg) {
    // Fallback to CJS resolution if we can't find package.json
    return import(resolvedPath);
  }

  // Determine ESM entry: exports.import > exports.default > module > main
  let entry = pkg.main || 'index.js';
  if (pkg.exports) {
    const exp = pkg.exports['.'] || pkg.exports;
    if (typeof exp === 'string') {
      entry = exp;
    } else if (exp.import) {
      entry = typeof exp.import === 'string' ? exp.import : exp.import.default;
    } else if (exp.default) {
      entry = exp.default;
    }
  } else if (pkg.module) {
    entry = pkg.module;
  }

  const entryPath = join(pkgDir, entry);
  return import(pathToFileURL(entryPath).href);
}

/**
 * Start the Vite development server
 * Runs in the context of a user's project directory
 */
export async function dev(projectRoot = process.cwd(), args = []) {
  // Check for package.json
  const pkgJsonPath = join(projectRoot, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    console.error('Error: No package.json found in current directory');
    console.error('Make sure you are in a Sunpeak project directory');
    process.exit(1);
  }

  // Import vite and plugins from the project's node_modules (ESM)
  const require = createRequire(join(projectRoot, 'package.json'));
  const vite = await importFromProject(require, 'vite');
  const createServer = vite.createServer;
  const reactPlugin = await importFromProject(require, '@vitejs/plugin-react');
  const react = reactPlugin.default;
  const tailwindPlugin = await importFromProject(require, '@tailwindcss/vite');
  const tailwindcss = tailwindPlugin.default;

  // Parse port from args or use default
  let port = parseInt(process.env.PORT || '3000');
  const portArgIndex = args.findIndex(arg => arg === '--port' || arg === '-p');
  if (portArgIndex !== -1 && args[portArgIndex + 1]) {
    port = parseInt(args[portArgIndex + 1]);
  }

  // Parse --no-begging flag
  const noBegging = args.includes('--no-begging');

  // Parse --prod-mcp flag (serve production build files over MCP instead of Vite HMR)
  const prodMcp = args.includes('--prod-mcp');

  console.log(`Starting Vite dev server on port ${port}...`);

  // Check if we're in the sunpeak workspace (directory is named "template")
  const isTemplate = basename(projectRoot) === 'template';
  const parentSrc = resolve(projectRoot, '../src');

  // Import sunpeak modules (MCP server and discovery utilities)
  // Use discovery-cli which only exports Node.js-safe utilities (no React components)
  let sunpeakMcp, sunpeakDiscovery;
  if (isTemplate) {
    // In workspace dev mode, use Vite to load TypeScript source directly
    const loaderServer = await createServer({
      root: resolve(projectRoot, '..'),
      server: { middlewareMode: true },
      appType: 'custom',
      logLevel: 'silent',
    });
    sunpeakMcp = await loaderServer.ssrLoadModule('./src/mcp/index.ts');
    sunpeakDiscovery = await loaderServer.ssrLoadModule('./src/lib/discovery-cli.ts');
    await loaderServer.close();
  } else {
    // Import from installed sunpeak package
    const sunpeakBase = require.resolve('sunpeak').replace(/dist\/index\.(c)?js$/, '');
    sunpeakMcp = await import(pathToFileURL(join(sunpeakBase, 'dist/mcp/index.js')).href);
    sunpeakDiscovery = await import(pathToFileURL(join(sunpeakBase, 'dist/lib/discovery-cli.js')).href);
  }
  const { FAVICON_BUFFER: faviconBuffer, runMCPServer } = sunpeakMcp;
  const { findResourceDirs, findSimulationFiles, extractResourceExport } = sunpeakDiscovery;

  // Vite plugin to serve the sunpeak favicon
  const sunpeakFaviconPlugin = () => ({
    name: 'sunpeak-favicon',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/favicon.ico') {
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Content-Length', faviconBuffer.length);
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.end(faviconBuffer);
          return;
        }
        next();
      });
    },
  });

  // Create and start Vite dev server programmatically
  const server = await createServer({
    root: projectRoot,
    plugins: [react(), tailwindcss(), sunpeakFaviconPlugin()],
    resolve: {
      alias: {
        // In workspace dev mode, use local sunpeak source
        ...(isTemplate && {
          sunpeak: parentSrc,
        }),
      },
    },
    server: {
      port,
      open: true,
    },
  });

  await server.listen();
  server.printUrls();
  server.bindCLIShortcuts({ print: true });

  // Print star-begging message unless --no-begging is set
  if (!noBegging) {
    // #FFB800 in 24-bit ANSI color
    console.log('\n\n\x1b[38;2;255;184;0m\u2b50\ufe0f \u2192 \u2764\ufe0f  https://github.com/Sunpeak-AI/sunpeak\x1b[0m\n');
  }

  // Discover simulations using sunpeak's discovery utilities
  const resourcesDir = join(projectRoot, 'src/resources');
  const simulationsDir = join(projectRoot, 'tests/simulations');
  const resourceDirs = findResourceDirs(resourcesDir, (key) => `${key}-resource.tsx`, fs);

  const simulations = [];
  for (const { key: resourceKey, dir: resourceDir, resourcePath } of resourceDirs) {
    const resource = await extractResourceExport(resourcePath);
    const resourceSimDir = join(simulationsDir, resourceKey);
    const simulationFiles = findSimulationFiles(resourceSimDir, resourceKey, fs);

    for (const { filename, path: simPath } of simulationFiles) {
      const simulationKey = filename.replace(/-simulation\.json$/, '');
      const simulation = JSON.parse(readFileSync(simPath, 'utf-8'));

      simulations.push({
        ...simulation,
        name: simulationKey,
        distPath: join(projectRoot, `dist/${resourceKey}/${resourceKey}.html`),
        srcPath: `/src/resources/${resourceKey}/${resourceKey}-resource.tsx`,
        resource,
      });
    }
  }

  // Start MCP server with its own Vite instance (unless --prod-mcp is set)
  if (simulations.length > 0) {
    const mcpMode = prodMcp ? 'production build' : 'Vite HMR';
    console.log(`\nStarting MCP server with ${simulations.length} simulation(s) (${mcpMode})...`);

    let mcpViteServer = null;

    if (!prodMcp) {
      // Virtual entry module plugin for MCP
      const sunpeakEntryPlugin = () => ({
        name: 'sunpeak-entry',
        resolveId(id) {
          if (id.startsWith('virtual:sunpeak-entry')) {
            return id;
          }
        },
        load(id) {
          if (id.startsWith('virtual:sunpeak-entry')) {
            const url = new URL(id.replace('virtual:sunpeak-entry', 'http://x'));
            const srcPath = url.searchParams.get('src');
            const componentName = url.searchParams.get('component');

            if (!srcPath || !componentName) {
              return 'console.error("Missing src or component param");';
            }

            return `
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from 'sunpeak';
import '/src/styles/globals.css';
import * as ResourceModule from '${srcPath}';

// Reuse React root across HMR updates to preserve the AppProvider host connection.
// The host renders this HTML inline (not at a fetchable URL), so location.reload()
// would blank the iframe. Self-accept prevents that by re-executing with fresh imports.
const root = import.meta.hot?.data?.root ?? createRoot(document.getElementById('root'));
if (import.meta.hot) import.meta.hot.data.root = root;

const Component = ResourceModule.default || ResourceModule['${componentName}'];
if (!Component) {
  document.getElementById('root').innerHTML = '<pre style="color:red;padding:16px">Component not found: ${componentName}\\nExports: ' + Object.keys(ResourceModule).join(', ') + '</pre>';
} else {
  const appInfo = { name: ResourceModule.resource?.name || '${componentName}', version: '1.0.0' };
  root.render(
    createElement(AppProvider, { appInfo }, createElement(Component))
  );
}

if (import.meta.hot) {
  import.meta.hot.accept();
}
`;
          }
        },
      });

      // Create Vite dev server in middleware mode for MCP
      // Use separate cache directory to avoid conflicts with main dev server
      mcpViteServer = await createServer({
        root: projectRoot,
        cacheDir: 'node_modules/.vite-mcp',
        plugins: [react(), tailwindcss(), sunpeakEntryPlugin()],
        resolve: {
          alias: {
            ...(isTemplate && {
              sunpeak: parentSrc,
            }),
          },
        },
        server: {
          middlewareMode: true,
          allowedHosts: true,
          watch: {
            // Only watch files that affect the UI bundle (not JSON, tests, etc.)
            // MCP resources reload on next tool call, not on file change
            ignored: (filePath) => {
              if (!filePath.includes('.')) return false; // Watch directories
              if (/\.(tsx?|css)$/.test(filePath)) {
                return /\.(test|spec)\.tsx?$/.test(filePath); // Ignore tests
              }
              return true; // Ignore everything else
            },
          },
        },
        optimizeDeps: {
          include: ['react', 'react-dom/client'],
        },
        appType: 'custom',
      });
    }

    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    runMCPServer({
      name: pkg.name || 'Sunpeak',
      version: pkg.version || '0.1.0',
      simulations,
      port: 8000,
      ...(mcpViteServer && { viteServer: mcpViteServer }),
    });

    // Handle signals - close both servers
    process.on('SIGINT', async () => {
      if (mcpViteServer) await mcpViteServer.close();
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      if (mcpViteServer) await mcpViteServer.close();
      await server.close();
      process.exit(0);
    });
  } else {
    // No simulations - just handle signals for the dev server
    process.on('SIGINT', async () => {
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await server.close();
      process.exit(0);
    });
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  dev(process.cwd(), args).catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
