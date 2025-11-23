import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export interface MCPServerConfig {
  name?: string;
  version?: string;
  port?: number;
  distPath: string;
  toolName?: string;
  toolDescription?: string;
  dummyData?: Record<string, unknown>;
}

function widgetDescriptorMeta() {
  return {
    "openai/outputTemplate": "ui://widget/app.html",
    "openai/toolInvocation/invoking": "Loading your app",
    "openai/toolInvocation/invoked": "App loaded",
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  } as const;
}

function widgetInvocationMeta() {
  return {
    "openai/toolInvocation/invoking": "Loading your app",
    "openai/toolInvocation/invoked": "App loaded",
  } as const;
}

function readWidgetHtml(distPath: string): string {
  const htmlPath = path.resolve(distPath);

  if (!fs.existsSync(htmlPath)) {
    throw new Error(
      `Widget HTML not found at ${htmlPath}. Run "pnpm build" to generate the built app.`
    );
  }

  const jsContents = fs.readFileSync(htmlPath, "utf8");

  // Wrap the JS in a minimal HTML shell suitable for ChatGPT
  // Styles should already be bundled in the JS by the template's build process
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
  const {
    name = "sunpeak-app",
    version = "0.1.0",
    toolName = "show-app",
    toolDescription = "Show the app",
    dummyData = {},
  } = config;

  const widgetHtml = readWidgetHtml(config.distPath);

  const toolInputSchema = {
    type: "object",
    properties: {},
    additionalProperties: false,
  } as const;

  const toolInputParser = z.object({});

  const tool: Tool = {
    name: toolName,
    description: toolDescription,
    inputSchema: toolInputSchema,
    title: toolDescription,
    _meta: widgetDescriptorMeta(),
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
  };

  const resource: Resource = {
    uri: "ui://widget/app.html",
    name: toolDescription,
    description: `${toolDescription} widget markup`,
    mimeType: "text/html+skybridge",
    _meta: widgetDescriptorMeta(),
  };

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

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_request: ListResourcesRequest) => {
      console.log("[MCP] ListResources");
      return { resources: [resource] };
    }
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      console.log("[MCP] ReadResource:", request.params.uri);
      if (request.params.uri !== resource.uri) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      return {
        contents: [
          {
            uri: resource.uri,
            mimeType: "text/html+skybridge",
            text: widgetHtml,
            _meta: widgetDescriptorMeta(),
          },
        ],
      };
    }
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_request: ListToolsRequest) => {
      console.log("[MCP] ListTools");
      return { tools: [tool] };
    }
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      console.log("[MCP] CallTool:", request.params.name, request.params.arguments);
      if (request.params.name !== toolName) {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }

      toolInputParser.parse(request.params.arguments ?? {});

      return {
        content: [
          {
            type: "text",
            text: `Rendered ${toolDescription}!`,
          },
        ],
        structuredContent: dummyData,
        _meta: widgetInvocationMeta(),
      };
    }
  );

  return server;
}

type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();

const ssePath = "/mcp";
const postPath = "/mcp/messages";

async function handleSseRequest(
  res: ServerResponse,
  config: MCPServerConfig
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createAppServer(config);
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
  };

  transport.onerror = (error) => {
    console.error("SSE transport error", error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(sessionId);
    console.error("Failed to start SSE session", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Failed to process message", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}

export function runMCPServer(config: MCPServerConfig): void {
  const portEnv = Number(process.env.PORT ?? 6766);
  const port = config.port ?? (Number.isFinite(portEnv) ? portEnv : 6766);

  const httpServer = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      if (!req.url) {
        res.writeHead(400).end("Missing URL");
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
      console.log(`[HTTP] ${req.method} ${url.pathname}`);

      if (
        req.method === "OPTIONS" &&
        (url.pathname === ssePath || url.pathname === postPath)
      ) {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "content-type",
        });
        res.end();
        return;
      }

      if (req.method === "GET" && url.pathname === ssePath) {
        await handleSseRequest(res, config);
        return;
      }

      if (req.method === "POST" && url.pathname === postPath) {
        await handlePostMessage(req, res, url);
        return;
      }

      res.writeHead(404).end("Not Found");
    }
  );

  httpServer.on("clientError", (err: Error, socket) => {
    console.error("HTTP client error", err);
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });

  httpServer.listen(port, () => {
    console.log(`Sunpeak MCP server listening on http://localhost:${port}`);
    console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
    console.log(
      `  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`
    );
  });
}
