import { runMCPServer } from 'sunpeak/mcp';
import path from 'path';
import { fileURLToPath } from 'url';
import { SIMULATIONS } from '../src/simulations';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Add distPath to each simulation for the MCP server
const simulations = Object.entries(SIMULATIONS).map(([simulationKey, simulation]) => ({
  ...simulation,
  distPath: path.resolve(__dirname, `../dist/chatgpt/${simulationKey}.js`),
}));

runMCPServer({
  name: 'Sunpeak App',
  version: '0.1.0',
  simulations,
  port: 6766,
});
