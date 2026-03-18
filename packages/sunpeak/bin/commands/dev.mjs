#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
const { existsSync, readFileSync, watch: fsWatch } = fs;
const { join, resolve, basename, dirname } = path;
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { spawn } from 'child_process';
import { getPort } from '../lib/get-port.mjs';

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
 * Run an initial production build and watch source files for changes.
 * Tunnel clients (e.g. Claude via ngrok) are served the pre-built HTML since they
 * can't reach the local Vite dev server. This keeps the prod output up to date.
 *
 * When a file changes during a build, the current build is killed and restarted.
 */
function startBuildWatcher(projectRoot, resourcesDir, mcpHandle, { skipInitialBuild = false } = {}) {
  let activeChild = null;
  const sunpeakBin = join(dirname(new URL(import.meta.url).pathname), '..', 'sunpeak.js');

  const runBuild = () => {
    // Kill any in-progress build and start fresh
    if (activeChild) {
      activeChild.kill('SIGTERM');
      activeChild = null;
    }

    console.log(`[build] Building resources for the MCP server for non-ChatGPT hosts...`);
    const child = spawn(process.execPath, [sunpeakBin, 'build', '--quiet'], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'inherit'],
      env: { ...process.env, NODE_ENV: 'production' },
    });
    activeChild = child;

    child.on('exit', (code) => {
      if (child !== activeChild) return; // Superseded by a newer build
      activeChild = null;
      if (code === 0) {
        console.log(`[build] Built resources for the MCP server for non-ChatGPT hosts.`);
        // Notify non-local sessions (Claude, etc.) that resources changed
        mcpHandle?.invalidateResources();
      } else if (code !== null) {
        console.error(`[build] Failed (exit ${code})`);
      }
    });
  };

  // Initial build (skip when --prod-resources already ran a synchronous build)
  if (!skipInitialBuild) {
    runBuild();
  }

  // Watch src/resources/ for changes using fs.watch (recursive supported on macOS/Windows)
  let debounceTimer = null;
  try {
    fsWatch(resourcesDir, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      // Only rebuild on source file changes
      if (!/\.(tsx?|css)$/.test(filename)) return;
      // Skip test files
      if (/\.(test|spec)\.tsx?$/.test(filename)) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        runBuild();
      }, 500);
    });
    console.log('[build] Watching src/resources/ for changes...');
  } catch {
    console.warn('[build] Could not start file watcher — run "sunpeak build" manually after changes');
  }
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

  // Parse --prod-tools and --prod-resources flags
  const isProdTools = args.includes('--prod-tools');
  const isProdResources = args.includes('--prod-resources');

  if (isProdTools) console.log('Prod Tools enabled by default (toggle in simulator sidebar)');
  if (isProdResources) console.log('Prod Resources: resources will use production-built HTML from dist/');

  console.log(`Starting Vite dev server on port ${port}...`);

  // Check if we're in the sunpeak workspace (directory is named "template")
  const isTemplate = basename(projectRoot) === 'template';
  const parentSrc = resolve(projectRoot, '../src');

  // Import sunpeak modules (MCP server and discovery utilities)
  // Use discovery-cli which only exports Node.js-safe utilities (no React components)
  let sunpeakMcp, sunpeakDiscovery, loaderServer;
  if (isTemplate) {
    // In workspace dev mode, use Vite to load TypeScript source directly.
    // Keep the loader server alive — Vite 7's module runner invalidates loaded
    // modules on close, breaking dynamic imports (e.g. `await import('esbuild')`).
    loaderServer = await createServer({
      root: resolve(projectRoot, '..'),
      server: { middlewareMode: true, hmr: false },
      appType: 'custom',
      logLevel: 'silent',
    });
    sunpeakMcp = await loaderServer.ssrLoadModule('./src/mcp/index.ts');
    sunpeakDiscovery = await loaderServer.ssrLoadModule('./src/lib/discovery-cli.ts');
  } else {
    // Import from installed sunpeak package
    const sunpeakBase = require.resolve('sunpeak').replace(/dist\/index\.(c)?js$/, '');
    sunpeakMcp = await import(pathToFileURL(join(sunpeakBase, 'dist/mcp/index.js')).href);
    sunpeakDiscovery = await import(pathToFileURL(join(sunpeakBase, 'dist/lib/discovery-cli.js')).href);
  }
  const { FAVICON_BUFFER: faviconBuffer, runMCPServer } = sunpeakMcp;
  const { findResourceDirs, findSimulationFilesFlat, findToolFiles, extractResourceExport, extractToolExport } = sunpeakDiscovery;

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

  // Vite plugin that proxies callServerTool to real tool handlers
  const sunpeakCallToolPlugin = () => ({
    name: 'sunpeak-call-tool',
    configureServer(server) {
      server.middlewares.use('/__sunpeak/call-tool', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString());
        const { name, arguments: args } = body;
        const toolEntry = toolPathMap.get(name);
        if (!toolEntry) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            content: [{ type: 'text', text: `[Prod Tools] Tool "${name}" not found` }],
            isError: true,
          }));
          return;
        }
        try {
          // Re-load the handler module on each call so edits take effect without restart
          const mod = await toolLoaderServer.ssrLoadModule(`./${toolEntry.relativePath}`);
          const handler = mod.default;
          if (typeof handler !== 'function') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              content: [{ type: 'text', text: `[Prod Tools] Tool "${name}" has no default export handler` }],
              isError: true,
            }));
            return;
          }
          let result = await handler(args ?? {}, {});
          if (typeof result === 'string') {
            result = { content: [{ type: 'text', text: result }] };
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            content: [{ type: 'text', text: `[Prod Tools] Tool error: ${err.message}` }],
            isError: true,
          }));
        }
      });
    },
  });

  // Vite plugin that serves production-built HTML from dist/
  const sunpeakDistPlugin = () => ({
    name: 'sunpeak-dist',
    configureServer(server) {
      server.middlewares.use('/dist', (req, res, next) => {
        const filePath = join(projectRoot, 'dist', req.url);
        if (filePath.endsWith('.html')) {
          if (existsSync(filePath)) {
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(readFileSync(filePath));
          } else {
            // Return 404 instead of falling through to Vite's SPA fallback,
            // which would serve the simulator's own index.html.
            res.statusCode = 404;
            res.end();
          }
          return;
        }
        next();
      });
    },
  });

  // Create and start Vite dev server programmatically
  const server = await createServer({
    root: projectRoot,
    plugins: [
      react(),
      tailwindcss(),
      sunpeakFaviconPlugin(),
      sunpeakCallToolPlugin(),
      sunpeakDistPlugin(),
      // Health endpoint for Playwright webServer readiness check
      {
        name: 'sunpeak-health',
        configureServer(server) {
          server.middlewares.use('/health', (_req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
          });
        },
      },
    ],
    define: {
      '__SUNPEAK_PROD_TOOLS__': JSON.stringify(isProdTools),
      '__SUNPEAK_PROD_RESOURCES__': JSON.stringify(isProdResources),
    },
    resolve: {
      alias: {
        '@': path.resolve(projectRoot, 'src'),
        // In workspace dev mode, use local sunpeak source
        ...(isTemplate && {
          sunpeak: parentSrc,
        }),
      },
    },
    server: {
      port,
      // Don't auto-open browser when started by Playwright or CI
      open: !process.env.CI && !process.env.SUNPEAK_LIVE_TEST,
      // Allow tunnel hosts (ngrok, cloudflared, etc.) to reach the dev server
      allowedHosts: 'all',
    },
  });

  // --prod-resources: Run initial production build so dist/ is ready before server starts
  if (isProdResources) {
    console.log('Building production resources...');
    const sunpeakBin = join(dirname(new URL(import.meta.url).pathname), '..', 'sunpeak.js');
    const { execSync } = await import('child_process');
    try {
      execSync(`${process.execPath} ${sunpeakBin} build`, {
        cwd: projectRoot,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' },
      });
    } catch {
      console.error('Build failed. Run `sunpeak build` manually to debug.');
      process.exit(1);
    }
  }

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
  const toolsDir = join(projectRoot, 'src/tools');

  const resourceDirs = findResourceDirs(resourcesDir, (key) => `${key}.tsx`, fs);

  // Build resource metadata map
  const resourceMap = new Map();
  for (const { key, resourcePath } of resourceDirs) {
    const resource = await extractResourceExport(resourcePath);
    // Inject name from directory key if not explicitly set
    resource.name = resource.name ?? key;
    resourceMap.set(key, resource);
  }

  // Discover tool files and extract metadata
  const toolFiles = findToolFiles(toolsDir, fs);
  const toolMap = new Map();
  for (const { name: toolName, path: toolPath } of toolFiles) {
    try {
      const { tool } = await extractToolExport(toolPath);
      toolMap.set(toolName, { tool, path: toolPath });
    } catch (err) {
      console.warn(`Warning: Could not extract metadata from tool ${toolName}: ${err.message}`);
    }
  }

  // Create a project-level Vite SSR loader for loading backend-only tool handlers.
  // Backend-only tools (no resource) need real handlers since their return values
  // are consumed directly by UI resources via callServerTool.
  const toolLoaderServer = await createServer({
    root: projectRoot,
    server: { middlewareMode: true, hmr: false },
    resolve: {
      alias: {
        '@': path.resolve(projectRoot, 'src'),
        ...(isTemplate && { sunpeak: parentSrc }),
      },
    },
    appType: 'custom',
    logLevel: 'silent',
  });

  // Build path map for prod-tools handler reloading (re-imports on each call for HMR).
  // Also do an initial load to validate handlers and populate toolHandlerMap for the MCP server.
  const toolPathMap = new Map();
  const toolHandlerMap = new Map();
  for (const [toolName, { tool, path: toolPath }] of toolMap) {
    void tool; // Used for metadata; handler loaded unconditionally
    const relativePath = path.relative(projectRoot, toolPath);
    toolPathMap.set(toolName, { relativePath });
    try {
      const mod = await toolLoaderServer.ssrLoadModule(`./${relativePath}`);
      if (typeof mod.default === 'function') {
        toolHandlerMap.set(toolName, { handler: mod.default });
      }
    } catch (err) {
      console.warn(`Warning: Could not load handler for tool "${toolName}": ${err.message}`);
    }
  }

  // Discover simulations from flat directory
  const simulations = [];
  const simFiles = findSimulationFilesFlat(simulationsDir, fs);

  for (const { name: simName, path: simPath } of simFiles) {
    const simulation = JSON.parse(readFileSync(simPath, 'utf-8'));
    const toolName = typeof simulation.tool === 'string' ? simulation.tool : simName;

    // Look up tool metadata
    const toolEntry = toolMap.get(toolName);
    const tool = toolEntry?.tool;
    if (!tool) {
      console.warn(`Warning: Tool "${toolName}" not found for simulation "${simName}". Skipping.`);
      continue;
    }

    // tool.resource is the resource name string — find matching resource key
    const resourceName = tool.resource;
    const resourceKey = resourceName
      ? Array.from(resourceMap.keys()).find((k) => resourceMap.get(k).name === resourceName)
      : undefined;

    if (resourceName && !resourceKey) {
      console.warn(`Warning: No resource found for tool "${toolName}" in simulation "${simName}". Skipping.`);
      continue;
    }

    // Determine source path for the resource (if it has a UI)
    const resourceDir = resourceKey ? resourceDirs.find((d) => d.key === resourceKey) : undefined;
    const srcPath = resourceDir
      ? `/src/resources/${resourceKey}/${basename(resourceDir.resourcePath)}`
      : undefined;

    simulations.push({
      ...simulation,
      ...(typeof simulation.tool === 'string' ? { tool: { name: toolName, ...tool } } : {}),
      name: simName,
      ...(resourceKey ? {
        distPath: join(projectRoot, `dist/${resourceKey}/${resourceKey}.html`),
        srcPath,
        resource: resourceMap.get(resourceKey),
      } : {}),
      // Attach real handler for tools consumed by the MCP server.
      // Backend-only tools (no resource) always need handlers for callServerTool.
      // UI tools only get handlers in --prod-tools mode (otherwise simulation mock data is used).
      ...((toolHandlerMap.has(toolName) && (!resourceKey || isProdTools)) ? {
        handler: toolHandlerMap.get(toolName).handler,
      } : {}),
    });
  }

  // Register backend-only tools that have real handlers but no simulation file.
  // These tools are callable by resources via callServerTool (e.g., a "review" tool
  // that processes confirm/cancel actions). Without this, ChatGPT can't proxy
  // callServerTool calls to the MCP server because the tool isn't registered.
  for (const [toolName, { tool }] of toolMap) {
    if (tool.resource) continue; // UI tools need simulations for their resource
    const alreadyCovered = simulations.some(s =>
      (s.tool?.name === toolName) || (typeof s.tool === 'string' && s.tool === toolName)
    );
    if (alreadyCovered) continue;
    const handlerInfo = toolHandlerMap.get(toolName);
    simulations.push({
      name: `__tool_${toolName}`,
      tool: { name: toolName, ...tool },
      ...(handlerInfo ? { handler: handlerInfo.handler } : {}),
    });
  }

  // Start MCP server with its own Vite instance for HMR
  if (simulations.length > 0) {
    // Find available ports for the MCP server and HMR WebSocket
    const mcpPort = await getPort(8000);
    const hmrPort = await getPort(Number(process.env.SUNPEAK_HMR_PORT || 24679));

    console.log(`\nStarting MCP server with ${simulations.length} simulation(s) (Vite HMR)...`);

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
  const appInfo = { name: ${JSON.stringify(pkg.name || 'sunpeak-app')}, version: ${JSON.stringify(pkg.version || '0.1.0')} };
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
    const mcpViteServer = await createServer({
      root: projectRoot,
      cacheDir: 'node_modules/.vite-mcp',
      plugins: [react(), tailwindcss(), sunpeakEntryPlugin()],
      resolve: {
        alias: {
          '@': path.resolve(projectRoot, 'src'),
          ...(isTemplate && {
            sunpeak: parentSrc,
          }),
        },
      },
      server: {
        middlewareMode: true,
        hmr: { port: hmrPort },
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

    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

    const mcpHandle = runMCPServer({
      name: pkg.name || 'Sunpeak',
      version: pkg.version || '0.1.0',
      simulations,
      port: mcpPort,
      hmrPort,
      // In --prod-resources mode, don't pass viteServer so the MCP server serves pre-built HTML.
      // Otherwise, pass it so ChatGPT gets Vite HMR.
      viteServer: isProdResources ? undefined : mcpViteServer,
    });

    // Build production bundles and watch for changes.
    // Tunnel clients (e.g. Claude via ngrok) get the pre-built HTML since they can't
    // reach the local Vite dev server. The watcher rebuilds on source file changes
    // so the prod output stays fresh without manual `sunpeak build`.
    // On successful builds, mcpHandle.invalidateResources() notifies tunnel sessions.
    startBuildWatcher(projectRoot, resourcesDir, mcpHandle, { skipInitialBuild: isProdResources });

    // Handle signals - close all servers
    process.on('SIGINT', async () => {
      await mcpViteServer.close();
      await toolLoaderServer.close();
      if (loaderServer) await loaderServer.close();
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await mcpViteServer.close();
      await toolLoaderServer.close();
      if (loaderServer) await loaderServer.close();
      await server.close();
      process.exit(0);
    });
  } else {
    // No simulations - just handle signals for the dev server
    process.on('SIGINT', async () => {
      await toolLoaderServer.close();
      if (loaderServer) await loaderServer.close();
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await toolLoaderServer.close();
      if (loaderServer) await loaderServer.close();
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
