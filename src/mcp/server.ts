import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

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

import { type MCPServerConfig } from './types.js';

export type { MCPServerConfig, SimulationWithDist, SimulationCallToolResult } from './types.js';

/**
 * Read and wrap resource JS in HTML shell.
 * Assumes styles are already bundled in the JS by the build process.
 */
function readResourceHtml(distPath: string): string {
  const htmlPath = path.resolve(distPath);

  if (!fs.existsSync(htmlPath)) {
    throw new Error(
      `Widget file not found at ${htmlPath}. Run "pnpm build" to generate the built app.`
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

function createAppServer(config: MCPServerConfig): Server {
  const { name = 'sunpeak-app', version = '0.1.0', simulations } = config;

  const toolInputParser = z.object({});

  // Read resource content for each simulation
  const resourceContentMap = new Map(
    simulations.map((simulation) => [simulation.tool.name, readResourceHtml(simulation.distPath)])
  );

  // Generate base-36 timestamp once for this server instance
  const timestamp = Date.now().toString(36);

  // Use tools and resources directly from simulations (official MCP SDK types)
  // Add timestamped URI to each tool's resource's URI to cache-bust
  const tools = simulations.map((simulation) => {
    const tool = simulation.tool;
    const meta = tool._meta as Record<string, unknown> | undefined;
    const outputTemplate = meta?.['openai/outputTemplate'];

    if (outputTemplate && typeof outputTemplate === 'string') {
      const timestampedUri = outputTemplate.includes('.')
        ? outputTemplate.replace(/(\.[^.]+)$/, `-${timestamp}$1`)
        : `${outputTemplate}-${timestamp}`;

      return {
        ...tool,
        _meta: {
          ...(meta ?? {}),
          'openai/outputTemplate': timestampedUri,
        },
      };
    }

    return tool;
  });

  const resources = simulations.map((simulation) => simulation.resource);

  // Create maps for quick lookup of tool call data
  const toolCallDataMap = new Map(
    simulations.map((simulation) => [
      simulation.tool.name,
      simulation.toolCall ?? { structuredContent: null, _meta: {} },
    ])
  );

  const resourceMap = new Map(
    resources.map((resource, index) => [
      resource.uri,
      {
        content: resourceContentMap.get(simulations[index].tool.name)!,
        resource,
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
    console.log(`[MCP] ListResources → ${resources.length} resource(s)`);
    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
    // Strip timestamp suffix from URI (e.g., "carousel-m8k3j5.html" -> "carousel.html")
    const requestedUri = request.params.uri;
    const cleanedUri = requestedUri.includes('.')
      ? requestedUri.replace(/-[a-z0-9]+(\.[^.]+)$/, '$1')
      : requestedUri.replace(/-[a-z0-9]+$/, '');

    const resourceData = resourceMap.get(cleanedUri);
    if (!resourceData) {
      throw new Error(`Unknown resource: ${request.params.uri} (cleaned: ${cleanedUri})`);
    }

    const sizeKB = (resourceData.content.length / 1024).toFixed(1);
    console.log(`[MCP] ReadResource: ${cleanedUri} → ${sizeKB}KB`);

    return {
      contents: [
        {
          uri: resourceData.resource.uri,
          mimeType: resourceData.resource.mimeType,
          text: resourceData.content,
          _meta: resourceData.resource._meta,
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

async function handleSseRequest(res: ServerResponse, config: MCPServerConfig) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const server = createAppServer(config);
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });
  console.log(`[MCP] Session started: ${sessionId.substring(0, 8)}... (${sessions.size} active)`);

  transport.onclose = async () => {
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
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
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

/**
 * Run the MCP server with the specified configuration.
 *
 * @param config - Server configuration with simulations.
 */
export function runMCPServer(config: MCPServerConfig): void {
  const portEnv = Number(process.env.PORT ?? 6766);
  const port = config.port ?? (Number.isFinite(portEnv) ? portEnv : 6766);

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.writeHead(400).end('Missing URL');
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    console.log(`[HTTP] ${req.method} ${url.pathname}`);

    if (req.method === 'OPTIONS' && (url.pathname === ssePath || url.pathname === postPath)) {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === ssePath) {
      await handleSseRequest(res, config);
      return;
    }

    if (req.method === 'POST' && url.pathname === postPath) {
      await handlePostMessage(req, res, url);
      return;
    }

    res.writeHead(404).end('Not Found');
  });

  httpServer.on('clientError', (err: Error, socket) => {
    console.error('HTTP client error', err);
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });

  httpServer.listen(port, () => {
    console.log(`Sunpeak MCP server listening on http://localhost:${port}`);
    console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
    console.log(`  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`);
  });

  // Graceful shutdown handler
  const shutdown = () => {
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

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
