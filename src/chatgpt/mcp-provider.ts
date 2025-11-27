/**
 * ChatGPT/OpenAI-specific MCP provider implementation.
 */

import fs from "node:fs";
import path from "node:path";
import type { Resource, Tool } from "@modelcontextprotocol/sdk/types.js";
import type {
  MCPProviderImplementation,
  ToolMeta,
} from "../mcp/types.js";

/**
 * Read and wrap tool JS in HTML shell suitable for ChatGPT.
 */
function readToolHtml(distPath: string): string {
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

/**
 * ChatGPT MCP provider implementation.
 */
export class ChatGPTMCPProvider implements MCPProviderImplementation {
  getDefaultToolMeta(): ToolMeta {
    return {};
  }

  readToolContent(distPath: string): string {
    return readToolHtml(distPath);
  }

  getToolMimeType(): string {
    return "text/html+skybridge";
  }

  createTool(config: {
    name: string;
    description: string;
    inputSchema: Tool["inputSchema"];
    metadata?: Record<string, unknown> | null;
  }): Tool {
    return {
      name: config.name,
      description: config.description,
      inputSchema: config.inputSchema,
      title: config.description,
      _meta: config.metadata ?? {},
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
    };
  }

  createResource(config: {
    name: string;
    description: string;
    uri: string;
    metadata?: Record<string, unknown> | null;
  }): Resource {
    return {
      uri: config.uri,
      name: config.name,
      description: `${config.description} widget markup`,
      mimeType: this.getToolMimeType(),
      _meta: config.metadata ?? {},
    };
  }
}

/**
 * Get the ChatGPT MCP provider instance.
 */
export function getChatGPTMCPProvider(): MCPProviderImplementation {
  return new ChatGPTMCPProvider();
}
