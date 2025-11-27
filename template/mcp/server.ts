import { runMCPServer } from 'sunpeak/mcp';
import path from 'path';
import { fileURLToPath } from 'url';
import { TOOL_CONFIGS } from '../src/simulations/tool-configs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build tools array from all tool configs
const tools = Object.entries(TOOL_CONFIGS).map(([toolKey, toolConfig]) => ({
  name: toolConfig.value,
  description: toolConfig.toolDescription,
  distPath: path.resolve(__dirname, `../dist/chatgpt/${toolKey}.js`),
  structuredContent: toolConfig.mcpToolOutput ?? null,
  listMetadata: toolConfig.mcpToolListMetadata ?? null,
  callMetadata: toolConfig.mcpToolCallMetadata ?? null,
  resourceUri: toolConfig.mcpResourceURI,
}));

runMCPServer({
  name: 'Sunpeak Tools',
  version: '0.1.0',
  tools,
  port: 6766,
});
