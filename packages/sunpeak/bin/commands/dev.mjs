#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
const { existsSync, readFileSync, watch: fsWatch } = fs;
const { join, resolve, basename, dirname } = path;
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { spawn } from 'child_process';
import { getPort } from '../lib/get-port.mjs';
import { startSandboxServer } from '../lib/sandbox-server.mjs';
import { lightningcssConfig } from '../lib/css.mjs';
import { inspectServer } from './inspect.mjs';

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
 * Start the Vite development server.
 *
 * Starts the MCP server (with Vite HMR for resources) and then launches the
 * inspector pointed at it. The inspector handles the UI, tool call proxying,
 * and resource loading — all through the MCP protocol.
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

  // Parse port from args or env. When neither is set, leave undefined so
  // inspectServer auto-discovers a free port (and doesn't use strictPort,
  // which would crash instead of falling back when port 3000 is busy).
  let port = undefined;
  const portArgIndex = args.findIndex(arg => arg === '--port' || arg === '-p');
  if (portArgIndex !== -1 && args[portArgIndex + 1]) {
    port = parseInt(args[portArgIndex + 1]);
  } else if (process.env.PORT) {
    port = parseInt(process.env.PORT);
  }

  // Parse --no-begging flag
  const noBegging = args.includes('--no-begging');

  // Parse flags
  const isProdTools = args.includes('--prod-tools');
  const isProdResources = args.includes('--prod-resources');

  if (isProdTools) console.log('Prod Tools: MCP tool calls will use real handlers instead of simulation mocks');
  if (isProdResources) console.log('Prod Resources: resources will use production-built HTML from dist/');

  console.log(`Starting dev server${port ? ` on port ${port}` : ''}...`);

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
  const { runMCPServer } = sunpeakMcp;
  const { findResourceDirs, findSimulationFilesFlat, findToolFiles, extractResourceExport, extractToolExport } = sunpeakDiscovery;

  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

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
      console.warn(`Warning: Could not extract metadata from tool "${toolName}" (${toolPath}):\n  ${err.message}\n  Expected: export const tool: AppToolConfig = { ... }`);
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
  // Extract the raw Zod shape (schema export) so the MCP server can register tools
  // with their actual inputSchema instead of z.object({}).passthrough().
  const toolHandlerMap = new Map();
  for (const [toolName, { tool, path: toolPath }] of toolMap) {
    void tool; // Used for metadata; handler loaded unconditionally
    const relativePath = path.relative(projectRoot, toolPath);
    try {
      const mod = await toolLoaderServer.ssrLoadModule(`./${relativePath}`);
      if (typeof mod.default === 'function') {
        toolHandlerMap.set(toolName, {
          handler: mod.default,
          outputSchema: mod.outputSchema,
          // The raw Zod shape from the tool file (e.g., { query: z.string(), limit: z.number() }).
          // Passed to the MCP server so tools/list reports actual parameter schemas instead of
          // empty objects. The MCP SDK duck-types Zod values (checks for parse/safeParse) so
          // this works across module instances.
          schema: mod.schema,
        });
      }
    } catch (err) {
      console.warn(`Warning: Could not load handler for tool "${toolName}" (${relativePath}):\n  ${err.message}`);
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
      console.warn(`Warning: Tool "${toolName}" not found for simulation "${simName}". Expected file: src/tools/${toolName}.ts`);
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
      // Attach output schema from the tool module (if present)
      ...(toolHandlerMap.has(toolName) && toolHandlerMap.get(toolName).outputSchema ? {
        outputSchema: toolHandlerMap.get(toolName).outputSchema,
      } : {}),
      // Attach real handler so Prod Tools mode works at runtime.
      // The --prod-tools flag only sets the default checkbox state; the handler
      // must always be available for when the user toggles it in the sidebar.
      ...(toolHandlerMap.has(toolName) ? {
        handler: toolHandlerMap.get(toolName).handler,
      } : {}),
      // Attach the raw Zod shape so the MCP server registers tools with real schemas.
      ...(toolHandlerMap.has(toolName) && toolHandlerMap.get(toolName).schema ? {
        inputSchema: toolHandlerMap.get(toolName).schema,
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
      ...(handlerInfo?.outputSchema ? { outputSchema: handlerInfo.outputSchema } : {}),
      ...(handlerInfo ? { handler: handlerInfo.handler } : {}),
      ...(handlerInfo?.schema ? { inputSchema: handlerInfo.schema } : {}),
    });
  }

  // Start MCP server with its own Vite instance for HMR
  if (simulations.length === 0) {
    console.warn('No simulations found. Create simulation files in tests/simulations/.');
    // Close loader servers since there's nothing to serve
    await toolLoaderServer.close();
    if (loaderServer) await loaderServer.close();
    return;
  }

  // Start the separate-origin sandbox server for cross-origin iframe isolation.
  const sandboxPort = Number(process.env.SUNPEAK_SANDBOX_PORT || 24680);
  const sandbox = await startSandboxServer({ preferredPort: sandboxPort });

  // Find available ports for the MCP server and HMR WebSocket
  const mcpPort = await getPort(Number(process.env.SUNPEAK_MCP_PORT || 8000));
  const hmrPort = await getPort(Number(process.env.SUNPEAK_HMR_PORT || 24679));

  console.log(`\nStarting MCP server with ${simulations.length} simulation(s) (Vite HMR)...`);

  // Virtual entry module plugin for MCP (serves resource HTML with HMR)
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
    css: { lightningcss: lightningcssConfig },
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
      // Pre-scan resource source files so ALL their dependencies are
      // discovered and pre-bundled at startup. Without this, the first
      // resource load discovers new deps (e.g., mapbox-gl, embla-carousel),
      // triggers re-optimization, and reloads all connections — killing
      // any active ChatGPT/Claude iframe connections with ECONNRESET.
      entries: [
        'src/resources/**/*.{ts,tsx}',
        'src/tools/**/*.ts',
      ],
      include: ['react', 'react-dom/client'],
    },
    appType: 'custom',
  });

  // Load server config from src/server.ts (if present) for server identity
  const serverEntryPath = join(projectRoot, 'src/server.ts');
  let serverInfo = undefined;
  let serverDisplayName = pkg.name ?? null;
  let serverDisplayIcon = undefined;
  if (existsSync(serverEntryPath)) {
    try {
      const serverMod = await toolLoaderServer.ssrLoadModule('./src/server.ts');
      if (serverMod.server && typeof serverMod.server === 'object') {
        serverInfo = serverMod.server;
        if (serverMod.server.name) serverDisplayName = serverMod.server.name;
        // Extract a display icon from the icons array (first non-dark icon, or first icon)
        const icons = serverMod.server.icons;
        if (Array.isArray(icons) && icons.length > 0) {
          const lightIcon = icons.find(i => !i.theme || i.theme === 'light') ?? icons[0];
          serverDisplayIcon = lightIcon?.src;
        }
      }
    } catch (err) {
      console.warn(`Warning: Could not load server config: ${err.message}`);
    }
  }

  const mcpHandle = runMCPServer({
    name: serverInfo?.name ?? pkg.name ?? 'Sunpeak',
    version: serverInfo?.version ?? pkg.version ?? '0.1.0',
    serverInfo,
    simulations,
    port: mcpPort,
    hmrPort,
    // In --prod-resources mode, don't pass viteServer so the MCP server serves pre-built HTML.
    // Otherwise, pass it so ChatGPT gets Vite HMR.
    viteServer: isProdResources ? undefined : mcpViteServer,
    // When --prod-tools is set, UI tool calls use real handlers instead of simulation mocks.
    prodTools: isProdTools,
  });

  // Wait for the MCP server to be listening before starting the inspector
  await mcpHandle.ready;

  // Build production bundles and watch for changes.
  // Tunnel clients (e.g. Claude via ngrok) get the pre-built HTML since they can't
  // reach the local Vite dev server. The watcher rebuilds on source file changes
  // so the prod output stays fresh without manual `sunpeak build`.
  // On successful builds, mcpHandle.invalidateResources() notifies tunnel sessions.
  startBuildWatcher(projectRoot, resourcesDir, mcpHandle, { skipInitialBuild: isProdResources });

  // Launch the inspector UI pointed at the local MCP server.
  // This serves the inspector UI via Vite, connecting to our MCP server as a client.
  // In framework mode, the inspector shows prod-tools/prod-resources toggles instead
  // of the server URL input.
  const mcpUrl = `http://localhost:${mcpPort}/mcp`;
  await inspectServer({
    server: mcpUrl,
    simulationsDir,
    port,
    name: serverDisplayName,
    sandboxUrl: sandbox.url,
    frameworkMode: true,
    defaultProdResources: isProdResources,
    projectRoot,
    noBegging,
    open: !process.env.CI && !process.env.SUNPEAK_LIVE_TEST,
    // In workspace dev mode, resolve sunpeak imports to source files so the
    // inspector's Vite server works without a pre-built dist/ directory.
    // The Tailwind plugin is also passed so source CSS (@import "tailwindcss") is processed.
    ...(isTemplate && {
      resolveAlias: {
        'sunpeak/inspector': resolve(parentSrc, 'inspector/index.ts'),
        'sunpeak/style.css': resolve(parentSrc, 'style.css'),
      },
      vitePlugins: [tailwindcss()],
      viteCssConfig: lightningcssConfig,
    }),
    // Direct tool handler call for Prod Tools Run button.
    // Re-imports via Vite SSR on each call so handlers pick up HMR changes.
    callToolDirect: async (name, args) => {
      for (const [toolName, { path: toolPath }] of toolMap) {
        if (toolName !== name) continue;
        const relativePath = path.relative(projectRoot, toolPath);
        const mod = await toolLoaderServer.ssrLoadModule(`./${relativePath}`);
        if (typeof mod.default !== 'function') {
          throw new Error(`Tool "${name}" has no default export handler`);
        }
        const startTime = performance.now();
        const result = await mod.default(args, {});
        const durationMs = Math.round((performance.now() - startTime) * 10) / 10;
        if (typeof result === 'string') {
          return { content: [{ type: 'text', text: result }], _meta: { _sunpeak: { requestTimeMs: durationMs } } };
        }
        const typed = result ?? {};
        return { ...typed, _meta: { ...typed._meta, _sunpeak: { requestTimeMs: durationMs } } };
      }
      throw new Error(`Tool "${name}" not found`);
    },
    onCleanup: async () => {
      await mcpViteServer.close();
      await toolLoaderServer.close();
      if (loaderServer) await loaderServer.close();
      await sandbox.close();
    },
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
