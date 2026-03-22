#!/usr/bin/env node
/**
 * `sunpeak inspect` — Connect to an external MCP server and launch the simulator.
 *
 * This command lets users test their own MCP server in the sunpeak simulator
 * without adopting the sunpeak framework conventions. It connects to the server
 * via MCP protocol, discovers tools and resources, and serves the simulator UI.
 *
 * Usage:
 *   sunpeak inspect --server http://localhost:8000/mcp
 *   sunpeak inspect --server "python my_server.py"
 *   sunpeak inspect --server http://localhost:8000/mcp --simulations tests/simulations
 */
import * as fs from 'fs';
import * as path from 'path';
const { existsSync, readdirSync, readFileSync } = fs;
const { join, resolve, dirname } = path;
import { fileURLToPath } from 'url';
import { getPort } from '../lib/get-port.mjs';
import { startSandboxServer } from '../lib/sandbox-server.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUNPEAK_PKG_DIR = resolve(__dirname, '..', '..');

/**
 * Parse CLI arguments.
 * @param {string[]} args
 */
function parseArgs(args) {
  const opts = {
    server: undefined,
    simulations: undefined,
    port: undefined,
    name: undefined,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--server' || arg === '-s') && i + 1 < args.length) {
      opts.server = args[++i];
    } else if (arg === '--simulations' && i + 1 < args.length) {
      opts.simulations = args[++i];
    } else if ((arg === '--port' || arg === '-p') && i + 1 < args.length) {
      opts.port = Number(args[++i]);
    } else if (arg === '--name' && i + 1 < args.length) {
      opts.name = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return opts;
}

function printHelp() {
  console.log(`
sunpeak inspect — Test an external MCP server in the simulator

Usage:
  sunpeak inspect --server <url-or-command>

Options:
  --server, -s <url|cmd>     MCP server URL or stdio command (required)
  --simulations <dir>        Simulation JSON directory (opt-in, no default)
  --port, -p <number>        Dev server port (default: 3000)
  --name <string>            App name in simulator chrome
  --help, -h                 Show this help

Examples:
  sunpeak inspect --server http://localhost:8000/mcp
  sunpeak inspect --server "python my_server.py"
  sunpeak inspect --server http://localhost:8000/mcp --simulations tests/simulations
`);
}

/**
 * Create an MCP client connection.
 * @param {string} serverArg - URL or command string
 * @returns {Promise<{ client: import('@modelcontextprotocol/sdk/client/index.js').Client, transport: import('@modelcontextprotocol/sdk/types.js').Transport }>}
 */
async function createMcpConnection(serverArg) {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const client = new Client({ name: 'sunpeak-inspector', version: '1.0.0' });

  if (serverArg.startsWith('http://') || serverArg.startsWith('https://')) {
    // HTTP/SSE transport
    const { StreamableHTTPClientTransport } = await import(
      '@modelcontextprotocol/sdk/client/streamableHttp.js'
    );
    const transport = new StreamableHTTPClientTransport(new URL(serverArg));
    await client.connect(transport);
    return { client, transport };
  } else {
    // Stdio transport — parse command string
    const parts = serverArg.split(/\s+/);
    const command = parts[0];
    const cmdArgs = parts.slice(1);
    const { StdioClientTransport } = await import(
      '@modelcontextprotocol/sdk/client/stdio.js'
    );
    const transport = new StdioClientTransport({ command, args: cmdArgs });
    await client.connect(transport);
    return { client, transport };
  }
}

/**
 * Discover tools and resources from the MCP server and build Simulation objects.
 * @param {import('@modelcontextprotocol/sdk/client/index.js').Client} client
 * @returns {Promise<Record<string, object>>} Map of simulation name → Simulation-shaped objects
 */
async function discoverSimulations(client) {
  const { tools } = await client.listTools();

  // Try to list resources (server may not support them)
  let resources = [];
  try {
    const result = await client.listResources();
    resources = result.resources || [];
  } catch {
    // Server doesn't support resources — that's fine
  }

  // Build resource URI map
  const resourceByUri = new Map();
  for (const resource of resources) {
    resourceByUri.set(resource.uri, resource);
  }

  const simulations = {};

  for (const tool of tools) {
    const simName = tool.name;

    // Match tool to resource via _meta.ui.resourceUri (MCP Apps extension).
    // Supports both nested format (_meta.ui.resourceUri) and deprecated flat
    // format (_meta["ui/resourceUri"]).
    let resource;
    let resourceUrl;
    const uri = tool._meta?.ui?.resourceUri ?? tool._meta?.['ui/resourceUri'];
    if (uri) {
      resource = resourceByUri.get(uri);
      if (resource) {
        resourceUrl = `/__sunpeak/read-resource?uri=${encodeURIComponent(uri)}`;
      }
    }

    simulations[simName] = {
      name: simName,
      tool,
      resource,
      resourceUrl,
    };
  }

  return simulations;
}

/**
 * Load simulation JSON fixtures from a directory and merge into discovered simulations.
 * @param {string} dir - Simulation directory path
 * @param {Record<string, object>} simulations - Discovered simulations to merge into
 */
function mergeSimulationFixtures(dir, simulations) {
  if (!existsSync(dir)) return;

  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    try {
      const fixture = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
      const toolName = fixture.tool;
      if (!toolName) continue;

      // Find matching simulation by tool name
      const sim = simulations[toolName];
      if (sim) {
        // Merge fixture data into discovered simulation
        if (fixture.toolInput !== undefined) sim.toolInput = fixture.toolInput;
        if (fixture.toolResult !== undefined) sim.toolResult = fixture.toolResult;
        if (fixture.serverTools !== undefined) sim.serverTools = fixture.serverTools;
        if (fixture.userMessage !== undefined) sim.userMessage = fixture.userMessage;
        if (fixture.hostContext !== undefined) sim.hostContext = fixture.hostContext;
      } else {
        // Create a new simulation from the fixture (tool not on server, but user wants to mock it)
        const simName = file.replace(/\.json$/, '');
        simulations[simName] = {
          name: simName,
          tool: { name: toolName, inputSchema: { type: 'object' } },
          toolInput: fixture.toolInput,
          toolResult: fixture.toolResult,
          serverTools: fixture.serverTools,
          userMessage: fixture.userMessage,
          hostContext: fixture.hostContext,
        };
      }
    } catch (err) {
      console.warn(`Warning: Failed to parse simulation fixture ${file}:`, err.message);
    }
  }
}

/**
 * Vite plugin that serves virtual modules for the inspect entry point.
 */
function sunpeakInspectVirtualPlugin(simulations, serverUrl, appName, appIcon, sandboxUrl) {
  const ENTRY_ID = 'virtual:sunpeak-inspect-entry';
  const RESOLVED_ENTRY_ID = '\0' + ENTRY_ID;

  return {
    name: 'sunpeak-inspect-virtual',
    resolveId(id) {
      if (id === ENTRY_ID) return RESOLVED_ENTRY_ID;
    },
    load(id) {
      if (id !== RESOLVED_ENTRY_ID) return;

      return `
import { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulator } from 'sunpeak/simulator';
import 'sunpeak/style.css';
import 'sunpeak/chatgpt/globals.css';

const simulations = ${JSON.stringify(simulations)};
const serverUrl = ${JSON.stringify(serverUrl)};
const appName = ${JSON.stringify(appName ?? 'MCP Inspector')};
const appIcon = ${JSON.stringify(appIcon ?? null)};
const sandboxUrl = ${JSON.stringify(sandboxUrl)};

const onCallTool = async (params) => {
  const res = await fetch('/__sunpeak/call-tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
};

const root = createRoot(document.getElementById('root'));
root.render(
  createElement(StrictMode, null,
    createElement(Simulator, {
      simulations,
      mcpServerUrl: serverUrl,
      appName,
      appIcon,
      sandboxUrl,
      onCallTool,
    })
  )
);
`;
    },
  };
}

/**
 * Vite plugin for MCP server proxy endpoints.
 */
function sunpeakInspectEndpointsPlugin(getClient) {
  return {
    name: 'sunpeak-inspect-endpoints',
    configureServer(server) {
      // List tools from connected server
      server.middlewares.use('/__sunpeak/list-tools', async (_req, res) => {
        try {
          const client = getClient();
          const result = await client.listTools();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // Call tool on connected server
      server.middlewares.use('/__sunpeak/call-tool', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end('Method not allowed');
          return;
        }

        const body = await readRequestBody(req);
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
          return;
        }

        try {
          const { name, arguments: args } = parsed;
          const client = getClient();
          const result = await client.callTool({ name, arguments: args });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              content: [{ type: 'text', text: `Error: ${err.message}` }],
              isError: true,
            })
          );
        }
      });

      // Reconnect to a new server URL.
      // Currently acknowledges without actually reconnecting — the MCP client
      // connection is established at startup. Changing the URL in the sidebar
      // requires restarting the inspect server. This endpoint exists so the
      // useMcpConnection hook can verify the server is reachable.
      server.middlewares.use('/__sunpeak/connect', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end('Method not allowed');
          return;
        }

        try {
          // Verify the MCP client is still connected by listing tools
          const client = getClient();
          await client.listTools();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // Read resource from connected server
      server.middlewares.use('/__sunpeak/read-resource', async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const uri = url.searchParams.get('uri');
        if (!uri) {
          res.writeHead(400);
          res.end('Missing uri parameter');
          return;
        }

        try {
          const client = getClient();
          const result = await client.readResource({ uri });
          const content = result.contents?.[0];
          if (!content) {
            res.writeHead(404);
            res.end('Resource not found');
            return;
          }

          const mimeType = content.mimeType || 'text/html';
          res.writeHead(200, { 'Content-Type': `${mimeType}; charset=utf-8` });
          if (typeof content.text === 'string') {
            res.end(content.text);
          } else if (content.blob) {
            res.end(Buffer.from(content.blob, 'base64'));
          } else {
            res.end('');
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(`Error reading resource: ${err.message}`);
        }
      });
    },
  };
}

/**
 * Read the full body of an HTTP request.
 */
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/**
 * Main inspect command entry point.
 */
export async function inspect(args) {
  const opts = parseArgs(args);

  if (!opts.server) {
    console.error('Error: --server is required.');
    console.error('Run "sunpeak inspect --help" for usage.');
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const simulationsDir = opts.simulations ? resolve(projectRoot, opts.simulations) : null;

  console.log(`Connecting to MCP server: ${opts.server}`);

  // Connect to the MCP server
  let mcpConnection;
  try {
    mcpConnection = await createMcpConnection(opts.server);
  } catch (err) {
    console.error(`Failed to connect to MCP server: ${err.message}`);
    process.exit(1);
  }

  console.log('Connected. Discovering tools and resources...');

  // Extract app name and icon from server info (reported during MCP initialize)
  const serverInfo = mcpConnection.client.getServerVersion();
  const serverAppName = opts.name ?? serverInfo?.name;
  const serverAppIcon = serverInfo?.icons?.[0]?.src;

  // Discover tools/resources and build simulations
  const simulations = await discoverSimulations(mcpConnection.client);
  const toolCount = Object.keys(simulations).length;
  const resourceCount = Object.values(simulations).filter((s) => s.resource).length;
  console.log(`Found ${toolCount} tool(s), ${resourceCount} resource(s).`);

  // Merge simulation fixtures only when explicitly provided via --simulations
  if (simulationsDir) {
    mergeSimulationFixtures(simulationsDir, simulations);
  }

  // Start sandbox server
  const sandboxPort = Number(process.env.SUNPEAK_SANDBOX_PORT) || undefined;
  const sandbox = await startSandboxServer({
    preferredPort: sandboxPort ?? 24680,
  });

  // Determine server port
  const port = opts.port || Number(process.env.PORT) || (await getPort(3000));

  // Import Vite
  const { createServer } = await import('vite');
  const react = (await import('@vitejs/plugin-react')).default;

  // Build the virtual index.html
  const appTitle = (serverAppName ?? 'MCP Inspector').replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]
  );
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appTitle} — sunpeak</title>
  <style>html, body, #root { margin: 0; padding: 0; height: 100%; }</style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/@id/__x00__virtual:sunpeak-inspect-entry"></script>
</body>
</html>`;

  // Create the Vite server.
  // Use the sunpeak package dir as root to avoid scanning the user's project
  // files for dependencies (which can cause resolution errors for @ aliases etc.)
  const server = await createServer({
    root: SUNPEAK_PKG_DIR,
    configFile: false,
    plugins: [
      react(),
      sunpeakInspectVirtualPlugin(
        simulations,
        opts.server,
        serverAppName,
        serverAppIcon,
        sandbox.url
      ),
      sunpeakInspectEndpointsPlugin(() => mcpConnection.client),
      // Serve virtual index.html
      {
        name: 'sunpeak-inspect-index-html',
        configureServer(server) {
          // Serve index.html for all non-API, non-asset requests (SPA fallback)
          server.middlewares.use((req, res, next) => {
            if (
              req.url === '/' ||
              req.url === '/index.html' ||
              (!req.url.startsWith('/__sunpeak/') &&
                !req.url.startsWith('/@') &&
                !req.url.startsWith('/node_modules/') &&
                req.url !== '/health' &&
                !req.url.includes('.'))
            ) {
              // Transform through Vite to resolve module imports
              server.transformIndexHtml(req.url, indexHtml).then((html) => {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(html);
              }).catch(next);
              return;
            }
            next();
          });
        },
      },
      // Paint fence responder (same as dev.mjs)
      {
        name: 'sunpeak-fence-responder',
        transformIndexHtml(html) {
          const fenceScript = `<script>window.addEventListener("message",function(e){if(e.data&&e.data.method==="sunpeak/fence"){var fid=e.data.params&&e.data.params.fenceId;requestAnimationFrame(function(){e.source.postMessage({jsonrpc:"2.0",method:"sunpeak/fence-ack",params:{fenceId:fid}},"*");});}});</script>`;
          return html.replace('</head>', fenceScript + '</head>');
        },
      },
      // Health endpoint
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
    server: {
      port,
      open: !process.env.CI,
      allowedHosts: 'all',
    },
    optimizeDeps: {
      // Only pre-bundle React — the virtual entry module imports sunpeak from
      // node_modules, so no user source scanning needed.
      include: ['react', 'react-dom', 'react/jsx-runtime'],
      // Disable scanning user's project files (avoids @ alias resolution errors)
      entries: [],
    },
  });

  await server.listen();
  server.printUrls();
  server.bindCLIShortcuts({ print: true });

  // Cleanup on exit
  const cleanup = async () => {
    await sandbox.close();
    try {
      await mcpConnection.client.close();
    } catch {
      // Ignore close errors
    }
    await server.close();
  };

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });
}
