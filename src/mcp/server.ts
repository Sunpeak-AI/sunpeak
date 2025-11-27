import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
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
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import {
  MCPProvider,
  type MCPServerConfig,
  type MCPProviderImplementation,
} from "./types.js";
import { getChatGPTMCPProvider } from "../chatgpt/mcp-provider.js";

export type { MCPServerConfig, MCPTool } from "./types.js";
export { MCPProvider } from "./types.js";

/**
 * Get the provider implementation for the specified provider type.
 */
function getProviderImplementation(
  provider: MCPProvider
): MCPProviderImplementation {
  switch (provider) {
    case MCPProvider.ChatGPT:
      return getChatGPTMCPProvider();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

function createAppServer(
  config: MCPServerConfig,
  providerImpl: MCPProviderImplementation
): Server {
  const {
    name = "sunpeak-app",
    version = "0.1.0",
    tools: toolConfigs,
  } = config;

  const toolInputSchema = {
    type: "object",
    properties: {},
    additionalProperties: false,
  } as const;

  const toolInputParser = z.object({});

  // Read tool content for each tool
  const toolContentMap = new Map(
    toolConfigs.map((toolConfig) => [
      toolConfig.name,
      providerImpl.readToolContent(toolConfig.distPath),
    ])
  );

  // Create tools and resources from config
  const tools = toolConfigs.map((toolConfig) =>
    providerImpl.createTool({
      name: toolConfig.name,
      description: toolConfig.description,
      inputSchema: toolInputSchema,
      metadata: toolConfig.listMetadata ?? null,
    })
  );

  const resources = toolConfigs.map((toolConfig) =>
    providerImpl.createResource({
      name: toolConfig.name,
      description: toolConfig.description,
      uri: toolConfig.resourceUri,
      metadata: toolConfig.listMetadata ?? null,
    })
  );

  // Create maps for quick lookup of tool structured content and call metadata
  const toolStructuredContentMap = new Map(
    toolConfigs.map((toolConfig) => [toolConfig.name, toolConfig.structuredContent ?? null])
  );

  const toolCallMetadataMap = new Map(
    toolConfigs.map((toolConfig) => [toolConfig.name, toolConfig.callMetadata ?? null])
  );

  const resourceMap = new Map(
    resources.map((resource, index) => [resource.uri, {
      content: toolContentMap.get(toolConfigs[index].name)!,
      resource,
    }])
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

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_request: ListResourcesRequest) => {
      console.log("[MCP] ListResources");
      return { resources };
    }
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      console.log("[MCP] ReadResource:", request.params.uri);

      const resourceData = resourceMap.get(request.params.uri);
      if (!resourceData) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      return {
        contents: [
          {
            uri: resourceData.resource.uri,
            mimeType: providerImpl.getToolMimeType(),
            text: resourceData.content,
            _meta: resourceData.resource._meta,
          },
        ],
      };
    }
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_request: ListToolsRequest) => {
      console.log("[MCP] ListTools");
      return { tools };
    }
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      console.log(
        "[MCP] CallTool:",
        request.params.name,
        request.params.arguments
      );

      const toolConfig = toolConfigs.find((t) => t.name === request.params.name);
      if (!toolConfig) {
        throw new Error(`Tool config not found: ${request.params.name}`);
      }

      const structuredContent = toolStructuredContentMap.get(request.params.name);
      const callMetadata = toolCallMetadataMap.get(request.params.name);

      toolInputParser.parse(request.params.arguments ?? {});

      // Use tool-specific call metadata
      const _meta = callMetadata ?? {};

      return {
        content: [
          {
            type: "text",
            text: `Rendered ${toolConfig.description}!`,
          },
        ],
        structuredContent: structuredContent ?? undefined,
        _meta,
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
  config: MCPServerConfig,
  providerImpl: MCPProviderImplementation
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createAppServer(config, providerImpl);
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

/**
 * Run the MCP server with the specified configuration.
 *
 * @param config - Server configuration including the provider type.
 *                 Defaults to ChatGPT provider if not specified.
 */
export function runMCPServer(config: MCPServerConfig): void {
  const provider = config.provider ?? MCPProvider.ChatGPT;
  const providerImpl = getProviderImplementation(provider);

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
        await handleSseRequest(res, config, providerImpl);
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
    console.log(
      `Sunpeak MCP server (${provider}) listening on http://localhost:${port}`
    );
    console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
    console.log(
      `  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`
    );
  });
}
