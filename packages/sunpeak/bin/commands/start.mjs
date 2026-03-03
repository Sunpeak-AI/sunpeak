#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

/**
 * Start a production MCP server from built artifacts.
 *
 * Discovers compiled tools from dist/tools/, resources from dist/{name}/,
 * and optional server entry from dist/server.js. Registers tools with
 * real handlers and Zod schemas, serves pre-built resource HTML.
 *
 * Run `sunpeak build` before `sunpeak start`.
 */
export async function start(projectRoot = process.cwd(), args = []) {
  const pkgJsonPath = join(projectRoot, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    console.error('Error: No package.json found in current directory');
    console.error('Make sure you are in a Sunpeak project directory');
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  const distDir = join(projectRoot, 'dist');

  if (!existsSync(distDir)) {
    console.error('Error: No dist/ directory found. Run `sunpeak build` first.');
    process.exit(1);
  }

  // Parse port from args or env
  let port = parseInt(process.env.PORT || '8000');
  const portArgIndex = args.findIndex(arg => arg === '--port' || arg === '-p');
  if (portArgIndex !== -1 && args[portArgIndex + 1]) {
    port = parseInt(args[portArgIndex + 1]);
  }

  // Import production server from sunpeak
  const isTemplate = projectRoot.endsWith('/template') || projectRoot.endsWith('\\template');
  let sunpeakMcp;
  if (isTemplate) {
    // In workspace dev mode — import from TypeScript source via dynamic import
    // We compile on the fly using the parent's Vite (same pattern as dev.mjs)
    const parentSrc = join(projectRoot, '../src');
    const require = createRequire(pkgJsonPath);
    const vite = await import(findEsmEntry(require, 'vite'));
    const loaderServer = await vite.createServer({
      root: join(projectRoot, '..'),
      server: { middlewareMode: true },
      appType: 'custom',
      logLevel: 'silent',
    });
    sunpeakMcp = await loaderServer.ssrLoadModule('./src/mcp/index.ts');
    await loaderServer.close();
  } else {
    const require = createRequire(pkgJsonPath);
    const sunpeakBase = require.resolve('sunpeak').replace(/dist\/index\.(c)?js$/, '');
    sunpeakMcp = await import(pathToFileURL(join(sunpeakBase, 'dist/mcp/index.js')).href);
  }

  const { startProductionHttpServer } = sunpeakMcp;

  // ========================================================================
  // Discover built resources
  // ========================================================================

  const resources = [];
  const entries = readdirSync(distDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'tools' || entry.name === 'build-output') continue;

    const name = entry.name;
    const jsonPath = join(distDir, name, `${name}.json`);
    const htmlPath = join(distDir, name, `${name}.html`);

    if (!existsSync(jsonPath) || !existsSync(htmlPath)) continue;

    const meta = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    const html = readFileSync(htmlPath, 'utf-8');

    resources.push({
      name: meta.name ?? name,
      uri: meta.uri ?? `ui://${name}`,
      html,
      description: meta.description,
      _meta: meta._meta,
    });
  }

  if (resources.length === 0) {
    console.error('Error: No built resources found in dist/. Run `sunpeak build` first.');
    process.exit(1);
  }

  console.log(`Found ${resources.length} resource(s): ${resources.map(r => r.name).join(', ')}`);

  // ========================================================================
  // Load compiled tool modules
  // ========================================================================

  const toolsDir = join(distDir, 'tools');
  const tools = [];

  if (existsSync(toolsDir)) {
    const toolFiles = readdirSync(toolsDir).filter(f => f.endsWith('.js'));

    for (const file of toolFiles) {
      const toolName = file.replace(/\.js$/, '');
      const toolPath = pathToFileURL(join(toolsDir, file)).href;

      try {
        const mod = await import(toolPath);
        const tool = mod.tool;
        const schema = mod.schema;
        const handler = mod.default;

        if (!tool) {
          console.warn(`Warning: No "tool" export in ${file}. Skipping.`);
          continue;
        }
        if (!handler || typeof handler !== 'function') {
          console.warn(`Warning: No default handler export in ${file}. Skipping.`);
          continue;
        }

        tools.push({ name: toolName, tool, schema, handler });
      } catch (err) {
        console.error(`Failed to load tool ${toolName}:`, err.message);
        process.exit(1);
      }
    }
  }

  if (tools.length === 0) {
    console.error('Error: No compiled tools found in dist/tools/. Run `sunpeak build` first.');
    process.exit(1);
  }

  console.log(`Found ${tools.length} tool(s): ${tools.map(t => t.name).join(', ')}`);

  // ========================================================================
  // Load server entry (optional)
  // ========================================================================

  const serverEntryPath = join(distDir, 'server.js');
  let auth = undefined;
  let serverConfig = {};

  if (existsSync(serverEntryPath)) {
    try {
      const serverEntry = await import(pathToFileURL(serverEntryPath).href);
      if (typeof serverEntry.auth === 'function') {
        auth = serverEntry.auth;
        console.log('Loaded auth from server entry');
      }
      if (serverEntry.server) {
        serverConfig = serverEntry.server;
      }
    } catch (err) {
      console.error('Failed to load server entry:', err.message);
      process.exit(1);
    }
  }

  // ========================================================================
  // Start production MCP server
  // ========================================================================

  const name = serverConfig.name ?? pkg.name ?? 'sunpeak-app';
  const version = serverConfig.version ?? pkg.version ?? '0.1.0';

  console.log(`\nStarting ${name} v${version} on port ${port}...`);

  startProductionHttpServer(
    { name, version, tools, resources, auth },
    port
  );
}

/**
 * Resolve ESM entry point for a package (same utility as build.mjs)
 */
function findEsmEntry(require, packageName) {
  const resolvedPath = require.resolve(packageName);
  let dir = dirname(resolvedPath);
  while (dir !== dirname(dir)) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.name === packageName) {
        const exports = pkg.exports;
        if (exports?.['.']?.import) {
          const importEntry = exports['.'].import;
          const esmPath = typeof importEntry === 'string' ? importEntry : importEntry.default;
          if (esmPath) return pathToFileURL(join(dir, esmPath)).href;
        }
        if (pkg.module) return pathToFileURL(join(dir, pkg.module)).href;
        break;
      }
    }
    dir = dirname(dir);
  }
  return pathToFileURL(resolvedPath).href;
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  start(process.cwd(), args).catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
