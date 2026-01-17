#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname, resolve, basename } from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

/**
 * Import a module from the project's node_modules using ESM resolution
 */
async function importFromProject(require, moduleName) {
  const resolvedPath = require.resolve(moduleName);

  // Walk up to find package.json
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
    return import(resolvedPath);
  }

  // Determine ESM entry
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
 * Discover simulations from src/resources directories
 */
function discoverSimulations(projectRoot) {
  const resourcesDir = join(projectRoot, 'src/resources');
  const resourceDirs = readdirSync(resourcesDir, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory()
  );

  const simulations = [];

  for (const entry of resourceDirs) {
    const resourceKey = entry.name;
    const resourceDir = join(resourcesDir, resourceKey);
    const resourcePath = join(resourceDir, `${resourceKey}-resource.json`);

    if (!existsSync(resourcePath)) {
      continue;
    }

    const resource = JSON.parse(readFileSync(resourcePath, 'utf-8'));

    const dirFiles = readdirSync(resourceDir);
    for (const file of dirFiles) {
      if (file.endsWith('-simulation.json')) {
        const simulationKey = file.replace(/-simulation\.json$/, '');
        const simulationPath = join(resourceDir, file);
        const simulation = JSON.parse(readFileSync(simulationPath, 'utf-8'));

        simulations.push({
          ...simulation,
          name: simulationKey,
          distPath: join(projectRoot, `dist/${resourceKey}/${resourceKey}.js`),
          srcPath: `/src/resources/${resourceKey}/${resourceKey}-resource.tsx`,
          resource,
        });
      }
    }
  }

  return simulations;
}

/**
 * Start the MCP server with Vite HMR
 *
 * Architecture:
 * 1. Vite dev server runs in middleware mode on the same port
 * 2. MCP resources return HTML that loads from Vite
 * 3. Vite handles all HMR natively - no custom WebSocket needed
 */
export async function mcp(projectRoot = process.cwd(), args = []) {
  // Check for package.json
  const pkgJsonPath = join(projectRoot, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    console.error('Error: No package.json found in current directory');
    console.error('Make sure you are in a Sunpeak project directory');
    process.exit(1);
  }

  // Check for --no-vite flag (production mode)
  const noVite = args.includes('--no-vite');

  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  const require = createRequire(join(projectRoot, 'package.json'));

  // Discover simulations
  const simulations = discoverSimulations(projectRoot);
  if (simulations.length === 0) {
    console.error('Error: No simulations found in src/resources/');
    process.exit(1);
  }

  console.log(`Found ${simulations.length} simulation(s)`);

  let viteServer = null;

  if (!noVite) {
    console.log('Starting Vite dev server for HMR...\n');

    // Import vite and plugins from the project's node_modules
    const vite = await importFromProject(require, 'vite');
    const reactPlugin = await importFromProject(require, '@vitejs/plugin-react');
    const react = reactPlugin.default;
    const tailwindPlugin = await importFromProject(require, '@tailwindcss/vite');
    const tailwindcss = tailwindPlugin.default;

    // Check if we're in the sunpeak workspace (directory is named "template")
    const isTemplate = basename(projectRoot) === 'template';
    const parentSrc = resolve(projectRoot, '../src');

    // Virtual entry module plugin for consistent React resolution
    // This ensures React/ReactDOM imports in the entry module resolve to the same
    // pre-bundled versions as the component imports
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
import * as ResourceModule from '${srcPath}';

const Component = ResourceModule.default || ResourceModule['${componentName}'];
if (!Component) {
  document.getElementById('root').innerHTML = '<pre style="color:red;padding:16px">Component not found: ${componentName}\\nExports: ' + Object.keys(ResourceModule).join(', ') + '</pre>';
} else {
  createRoot(document.getElementById('root')).render(createElement(Component));
}
`;
        }
      },
    });

    // Create Vite dev server in middleware mode (matching skybridge's approach)
    viteServer = await vite.createServer({
      root: projectRoot,
      plugins: [react(), tailwindcss(), sunpeakEntryPlugin()],
      resolve: {
        alias: {
          // In workspace dev mode, use local sunpeak source
          ...(isTemplate && {
            sunpeak: parentSrc,
          }),
        },
      },
      server: {
        middlewareMode: true,
        // Allow all hosts for tunnel services (ngrok, cloudflared, etc.)
        allowedHosts: true,
        // Don't override HMR - let Vite handle it (like skybridge)
      },
      optimizeDeps: {
        include: ['react', 'react-dom/client'],
      },
      appType: 'custom',
    });
  } else {
    console.log('Starting MCP server (production mode, no HMR)...\n');
  }

  // Import runMCPServer from sunpeak/mcp
  // Use direct import with file URL for workspace compatibility
  const sunpeakMcpPath = join(require.resolve('sunpeak').replace(/dist\/index\.(c)?js$/, ''), 'dist/mcp/index.js');
  const sunpeakMcp = await import(pathToFileURL(sunpeakMcpPath).href);
  const { runMCPServer } = sunpeakMcp;

  // Start MCP server with Vite integration
  runMCPServer({
    name: pkg.name || 'Sunpeak',
    version: pkg.version || '0.1.0',
    simulations,
    port: 6766,
    viteServer,
  });

  // Handle signals
  process.on('SIGINT', async () => {
    if (viteServer) {
      await viteServer.close();
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    if (viteServer) {
      await viteServer.close();
    }
    process.exit(0);
  });
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  mcp(process.cwd(), args).catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
