/**
 * ChatGPT/OpenAI-specific MCP provider implementation.
 */

import fs from "node:fs";
import path from "node:path";
import type { Resource, Tool } from "@modelcontextprotocol/sdk/types.js";
import type {
  MCPProviderImplementation,
  WidgetDescriptorMeta,
  WidgetInvocationMeta,
} from "../mcp/types.js";

/**
 * OpenAI-specific metadata for widget descriptors.
 */
function widgetDescriptorMeta(): WidgetDescriptorMeta {
  return {
    "openai/outputTemplate": "ui://widget/app.html",
    "openai/toolInvocation/invoking": "Loading your app",
    "openai/toolInvocation/invoked": "App loaded",
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  };
}

/**
 * OpenAI-specific metadata for tool invocations.
 */
function widgetInvocationMeta(): WidgetInvocationMeta {
  return {
    "openai/toolInvocation/invoking": "Loading your app",
    "openai/toolInvocation/invoked": "App loaded",
  };
}

/**
 * Read and wrap widget JS in HTML shell suitable for ChatGPT.
 */
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

/**
 * ChatGPT MCP provider implementation.
 */
export class ChatGPTMCPProvider implements MCPProviderImplementation {
  getWidgetDescriptorMeta(): WidgetDescriptorMeta {
    return widgetDescriptorMeta();
  }

  getWidgetInvocationMeta(): WidgetInvocationMeta {
    return widgetInvocationMeta();
  }

  readWidgetContent(distPath: string): string {
    return readWidgetHtml(distPath);
  }

  getWidgetMimeType(): string {
    return "text/html+skybridge";
  }

  getWidgetResourceUri(): string {
    return "ui://widget/app.html";
  }

  createTool(config: {
    name: string;
    description: string;
    inputSchema: Tool["inputSchema"];
  }): Tool {
    return {
      name: config.name,
      description: config.description,
      inputSchema: config.inputSchema,
      title: config.description,
      _meta: widgetDescriptorMeta(),
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
    };
  }

  createResource(config: { name: string; description: string }): Resource {
    return {
      uri: this.getWidgetResourceUri(),
      name: config.name,
      description: `${config.description} widget markup`,
      mimeType: this.getWidgetMimeType(),
      _meta: widgetDescriptorMeta(),
    };
  }
}

/**
 * Get the ChatGPT MCP provider instance.
 */
export function getChatGPTMCPProvider(): MCPProviderImplementation {
  return new ChatGPTMCPProvider();
}
