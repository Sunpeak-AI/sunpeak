#!/usr/bin/env node
import { existsSync } from 'fs';
import { join, resolve, basename, dirname } from 'path';
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
  let port = parseInt(process.env.PORT || '6767');
  const portArgIndex = args.findIndex(arg => arg === '--port' || arg === '-p');
  if (portArgIndex !== -1 && args[portArgIndex + 1]) {
    port = parseInt(args[portArgIndex + 1]);
  }

  console.log(`Starting Vite dev server on port ${port}...`);

  // Check if we're in the sunpeak workspace (directory is named "template")
  const isTemplate = basename(projectRoot) === 'template';
  const parentSrc = resolve(projectRoot, '../src');

  // Import favicon from sunpeak library
  let faviconBuffer;
  if (isTemplate) {
    // In workspace dev mode, import from local dist folder
    const sunpeakMcp = await import(pathToFileURL(resolve(projectRoot, '../dist/mcp/index.js')).href);
    faviconBuffer = sunpeakMcp.FAVICON_BUFFER;
  } else {
    // Import from installed sunpeak package
    const sunpeakMcpPath = join(require.resolve('sunpeak').replace(/dist\/index\.(c)?js$/, ''), 'dist/mcp/index.js');
    const sunpeakMcp = await import(pathToFileURL(sunpeakMcpPath).href);
    faviconBuffer = sunpeakMcp.FAVICON_BUFFER;
  }

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

  // Handle signals
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  dev(process.cwd(), args).catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
