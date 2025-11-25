import { runMCPServer } from 'sunpeak/mcp';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load places data from JSON file
const placesDataPath = path.resolve(__dirname, '../data/places.json');
const toolOutput = JSON.parse(readFileSync(placesDataPath, 'utf-8'));

runMCPServer({
  name: 'my-sunpeak-app',
  version: '0.1.0',
  distPath: path.resolve(__dirname, '../dist/chatgpt/index.js'),
  toolName: 'show-places',
  toolDescription: 'Show popular places in Austin',
  dummyData: toolOutput,
  port: 6766,
});
