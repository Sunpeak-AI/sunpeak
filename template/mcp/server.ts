import { runMCPServer } from 'sunpeak/mcp';
import path from 'path';
import { fileURLToPath } from 'url';
import { activeConfig } from '../src/simulations/app-configs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

runMCPServer({
  name: activeConfig.appName,
  version: '0.1.0',
  distPath: path.resolve(__dirname, '../dist/chatgpt/index.js'),
  toolName: activeConfig.toolName,
  toolDescription: activeConfig.toolDescription,
  dummyData: activeConfig.toolOutput ?? {},
  port: 6766,
});
