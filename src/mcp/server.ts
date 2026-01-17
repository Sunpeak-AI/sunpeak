import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

import { FAVICON_BUFFER } from './favicon.js';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { type MCPServerConfig, type SimulationWithDist } from './types.js';

export type { MCPServerConfig, SimulationWithDist } from './types.js';

/**
 * Read and wrap resource JS in HTML shell (production mode).
 * Assumes styles are already bundled in the JS by the build process.
 */
function readResourceHtmlProd(distPath: string): string {
  const htmlPath = path.resolve(distPath);

  if (!fs.existsSync(htmlPath)) {
    throw new Error(
      `Widget file not found at ${htmlPath}. Run "sunpeak build" to generate the built app.`
    );
  }

  const jsContents = fs.readFileSync(htmlPath, 'utf8');

  return `<!DOCTYPE html>
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
}

/**
 * Generate HTML that loads from Vite dev server (dev mode with HMR).
 *
 * - Scripts load from localhost (not ngrok) to bypass ngrok warning page
 * - User must approve "local network access" in browser to allow localhost access
 * - HMR WebSocket connects to localhost
 *
 * @param srcPath - Path to the source file (e.g., "/src/resources/albums/albums-resource.tsx")
 */
function getViteResourceHtml(srcPath: string): string {
  // Extract component name from path: /src/resources/albums/albums-resource.tsx -> AlbumsResource
  const fileName =
    srcPath
      .split('/')
      .pop()
      ?.replace(/-resource\.tsx$/, '') ?? '';
  const componentName =
    fileName
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'Resource';

  // Use localhost URL for dev (not ngrok URL) to bypass ngrok warning page
  // Scripts load directly from localhost, user must approve "local network access" in browser
  const devServerUrl = 'http://localhost:6766';

  // Encode srcPath and componentName for the virtual entry module
  const entryParams = new URLSearchParams({ src: srcPath, component: componentName });
  // Vite serves virtual modules via /@id/ prefix
  const virtualModuleUrl = `${devServerUrl}/@id/virtual:sunpeak-entry?${entryParams.toString()}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <script type="module">
    import { injectIntoGlobalHook } from "${devServerUrl}/@react-refresh";
    injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
  </script>
  <script type="module" src="${devServerUrl}/@vite/client"></script>
  <script type="module">
    (async () => {
      if (!navigator.permissions?.query) return;
      const protocol = window.location.protocol;
      if (protocol !== 'http:' && protocol !== 'https:') return;
      const host = window.location.hostname;
      const isLoopback = host === 'localhost' || /^127\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$/.test(host) || host === '::1';
      if (isLoopback) return;
      try {
        const status = await navigator.permissions.query({ name: "local-network-access" });
        if (status.state === "denied") {
          document.getElementById('root').innerHTML = '<div style="background:#fef2f2;border:2px solid #ef4444;border-radius:8px;padding:16px;text-align:center;font-family:system-ui,sans-serif;"><div style="color:#ef4444;font-size:18px;font-weight:600;margin-bottom:8px;">Local network access permission is denied</div><div style="color:#ef4444;font-size:14px;">Please enable it in your browser settings. <a href="https://developer.chrome.com/blog/local-network-access" target="_blank" style="color:#ef4444;text-decoration:underline;">Learn more</a></div></div>';
        }
      } catch (e) {}
    })();
  </script>
  <div id="root"></div>
  <script type="module" src="${virtualModuleUrl}"></script>
</body>
</html>`;
}

/**
 * Get resource HTML content based on mode (Vite dev or production)
 */
function getResourceHtml(simulation: SimulationWithDist, viteMode: boolean): string {
  if (viteMode && simulation.srcPath) {
    return getViteResourceHtml(simulation.srcPath);
  }
  return readResourceHtmlProd(simulation.distPath);
}

// Vite dev server URLs for CSP
const DEV_SERVER_URL = 'http://localhost:6766';
const HMR_WS_URL = 'ws://localhost:24678';

/**
 * Inject localhost URLs into CSP for Vite dev mode.
 * Adds resource_domains for script loading and connect_domains for HMR WebSocket.
 */
function injectViteCSP(existingMeta: Record<string, unknown> | undefined): Record<string, unknown> {
  const meta = existingMeta ?? {};
  const widgetCSP = (meta['openai/widgetCSP'] as Record<string, unknown>) ?? {};

  const existingResourceDomains = (widgetCSP['resource_domains'] as string[]) ?? [];
  const resourceDomains = existingResourceDomains.includes(DEV_SERVER_URL)
    ? existingResourceDomains
    : [...existingResourceDomains, DEV_SERVER_URL];

  const existingConnectDomains = (widgetCSP['connect_domains'] as string[]) ?? [];
  const connectDomains = existingConnectDomains.includes(HMR_WS_URL)
    ? existingConnectDomains
    : [...existingConnectDomains, HMR_WS_URL];

  return {
    ...meta,
    'openai/widgetCSP': {
      ...widgetCSP,
      resource_domains: resourceDomains,
      connect_domains: connectDomains,
    },
  };
}

function createAppServer(
  config: MCPServerConfig,
  simulations: SimulationWithDist[],
  viteMode: boolean
): Server {
  const { name = 'sunpeak-app', version = '0.1.0' } = config;

  const toolInputParser = z.object({});

  // Generate fallback timestamp for resources without URIs (dev mode)
  const devTimestamp = Date.now().toString(36);

  // Build resources with URIs (use existing URI or generate one for dev mode)
  const resources = simulations.map((simulation) => {
    const resource = simulation.resource;
    const uri = (resource.uri as string) ?? `ui://${resource.name as string}-${devTimestamp}`;
    return { ...resource, uri };
  });

  // Build tools with outputTemplate URIs from resources
  const tools = simulations.map((simulation, index) => {
    const tool = simulation.tool;
    const meta = tool._meta as Record<string, unknown> | undefined;

    return {
      ...tool,
      _meta: {
        ...(meta ?? {}),
        'openai/outputTemplate': resources[index].uri,
      },
    };
  });

  // Create maps for quick lookup of tool call data
  const toolCallDataMap = new Map(
    simulations.map((simulation) => [
      simulation.tool.name,
      simulation.callToolResult ?? { structuredContent: null, _meta: {} },
    ])
  );

  // Map resource URI to simulation for content lookup
  const uriToSimulation = new Map(
    resources.map((resource, index) => [resource.uri, simulations[index]])
  );

  const resourceMetaMap = new Map(
    resources.map((resource, index) => [
      resource.uri,
      {
        resource,
        _meta: (simulations[index].resource as { _meta?: Record<string, unknown> })._meta,
      },
    ])
  );

  const server = new Server(
    {
      name,
      version,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListResourcesRequestSchema, async (_request: ListResourcesRequest) => {
    console.log(
      `[MCP] ListResources → ${resources.length} resource(s)${viteMode ? ' (vite mode)' : ''}`
    );

    if (viteMode) {
      const resourcesWithCsp = resources.map((resource) => ({
        ...resource,
        _meta: injectViteCSP(resource._meta as Record<string, unknown> | undefined),
      }));
      return { resources: resourcesWithCsp };
    }

    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
    const requestedUri = request.params.uri;
    const simulation = uriToSimulation.get(requestedUri);
    const meta = resourceMetaMap.get(requestedUri);

    if (!simulation || !meta) {
      throw new Error(`Unknown resource: ${requestedUri}`);
    }

    const content = getResourceHtml(simulation, viteMode);
    const sizeKB = (content.length / 1024).toFixed(1);
    console.log(`[MCP] ReadResource: ${requestedUri} → ${sizeKB}KB${viteMode ? ' (vite)' : ''}`);

    return {
      contents: [
        {
          uri: meta.resource.uri,
          mimeType: meta.resource.mimeType,
          text: content,
          _meta: viteMode ? injectViteCSP(meta._meta) : meta._meta,
        },
      ],
    };
  });

  server.setRequestHandler(ListToolsRequestSchema, async (_request: ListToolsRequest) => {
    console.log(`[MCP] ListTools → ${tools.length} tool(s)`);
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const args = request.params.arguments ?? {};
    const argKeys = Object.keys(args);
    const argsStr = argKeys.length > 0 ? `{${argKeys.join(', ')}}` : '{}';

    const simulation = simulations.find((s) => s.tool.name === request.params.name);
    if (!simulation) {
      throw new Error(`Simulation not found: ${request.params.name}`);
    }

    const toolCallData = toolCallDataMap.get(request.params.name);

    toolInputParser.parse(args);

    const hasStructuredContent = toolCallData?.structuredContent != null;
    console.log(
      `[MCP] CallTool: ${request.params.name}${argsStr} → ${hasStructuredContent ? 'structured' : 'text'}`
    );

    return {
      content: [
        {
          type: 'text',
          text: `Rendered ${simulation.tool.description}!`,
        },
      ],
      structuredContent: toolCallData?.structuredContent ?? undefined,
      _meta: toolCallData?._meta ?? {},
    };
  });

  return server;
}

type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();

const ssePath = '/mcp';
const postPath = '/mcp/messages';

async function handleSseRequest(
  res: ServerResponse,
  config: MCPServerConfig,
  simulations: SimulationWithDist[],
  viteMode: boolean
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const server = createAppServer(config, simulations, viteMode);
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });
  console.log(`[MCP] Session started: ${sessionId.substring(0, 8)}... (${sessions.size} active)`);

  transport.onclose = async () => {
    // Guard against re-entrancy (server.close() may trigger onclose again)
    if (!sessions.has(sessionId)) return;
    sessions.delete(sessionId);
    console.log(`[MCP] Session closed: ${sessionId.substring(0, 8)}... (${sessions.size} active)`);
    await server.close();
  };

  transport.onerror = (error) => {
    console.error(`[MCP] SSE transport error (${sessionId.substring(0, 8)}...):`, error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(sessionId);
    console.error(`[MCP] Failed to start session (${sessionId.substring(0, 8)}...):`, error);
    if (!res.headersSent) {
      res.writeHead(500).end('Failed to establish SSE connection');
    }
  }
}

async function handlePostMessage(req: IncomingMessage, res: ServerResponse, url: URL) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, ngrok-skip-browser-warning');
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    res.writeHead(400).end('Missing sessionId query parameter');
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404).end('Unknown session');
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error('Failed to process message', error);
    if (!res.headersSent) {
      res.writeHead(500).end('Failed to process message');
    }
  }
}

// Type for Vite dev server (minimal interface we need)
interface ViteDevServer {
  middlewares: {
    (req: IncomingMessage, res: ServerResponse, next?: () => void): void;
  };
  ws: {
    handleUpgrade: (
      request: IncomingMessage,
      socket: import('node:stream').Duplex,
      head: Buffer
    ) => void;
  };
}

/**
 * Run the MCP server with the specified configuration.
 *
 * @param config - Server configuration with simulations.
 */
export function runMCPServer(config: MCPServerConfig): void {
  const portEnv = Number(process.env.PORT ?? 6766);
  const port = config.port ?? (Number.isFinite(portEnv) ? portEnv : 6766);
  const { simulations } = config;

  // Check if Vite dev server is provided
  const viteServer = config.viteServer as ViteDevServer | undefined;
  const viteMode = !!viteServer;

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.writeHead(400).end('Missing URL');
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

    // CORS preflight for all routes
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, ngrok-skip-browser-warning',
      });
      res.end();
      return;
    }

    // Root path (ChatGPT checks this before fetching favicon)
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<link rel="icon" type="image/png" href="/favicon.ico" />
<title>Sunpeak MCP Server</title>
</head>
<body><h1>Sunpeak MCP Server</h1><p>Connect via <a href="/mcp">/mcp</a></p></body>
</html>`);
      return;
    }

    // Favicon endpoint (ChatGPT fetches this when connecting to an MCP server)
    if (req.method === 'GET' && url.pathname === '/favicon.ico') {
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': FAVICON_BUFFER.length,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(FAVICON_BUFFER);
      return;
    }

    // MCP SSE endpoint
    if (req.method === 'GET' && url.pathname === ssePath) {
      console.log(`[HTTP] ${req.method} ${url.pathname}`);
      await handleSseRequest(res, config, simulations, viteMode);
      return;
    }

    // MCP message endpoint
    if (req.method === 'POST' && url.pathname === postPath) {
      console.log(`[HTTP] ${req.method} ${url.pathname}`);
      await handlePostMessage(req, res, url);
      return;
    }

    // If Vite server is available, delegate all other requests to it
    if (viteServer) {
      // Add CORS headers for Vite-served content (needed for cross-origin widget loading)
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'content-type, ngrok-skip-browser-warning');
      viteServer.middlewares(req, res);
      return;
    }

    // No Vite server, return 404 for non-MCP routes
    console.log(`[HTTP] ${req.method} ${url.pathname} → 404`);
    res.writeHead(404).end('Not Found');
  });

  // Handle WebSocket upgrades for Vite HMR
  if (viteServer) {
    httpServer.on('upgrade', (request, socket, head) => {
      // Forward all WebSocket upgrades to Vite (it handles /@vite/ws)
      viteServer.ws.handleUpgrade(request, socket, head);
    });
  }

  httpServer.on('clientError', (err: Error, socket) => {
    console.error('HTTP client error', err);
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });

  httpServer.listen(port, () => {
    console.log(`Sunpeak MCP server listening on http://localhost:${port}`);
    console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
    if (viteMode) {
      console.log(`  Vite HMR: enabled (source files served with hot reload)`);
    }
  });

  // Graceful shutdown handler
  const shutdown = async () => {
    console.log('\nShutting down MCP server...');

    httpServer.close(() => {
      console.log('MCP server closed');
      process.exit(0);
    });

    // Force close after 5 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('Force closing MCP server');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}
