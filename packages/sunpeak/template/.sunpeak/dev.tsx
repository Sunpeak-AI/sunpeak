/// <reference types="vite/client" />
/**
 * Bootstrap file for Sunpeak dev server
 * This file bootstraps the ChatGPT simulator for development
 *
 * Auto-discovers simulations and resources by file naming convention:
 * - tests/simulations/{resource}/{resource}-{scenario}-simulation.json
 * - src/resources/{resource}/{resource}-resource.tsx (component + resource metadata)
 * - src/resources/{resource}/{Resource}Resource component (PascalCase)
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { chatgpt } from 'sunpeak';
import '../src/styles/globals.css';
import resourceComponents from '../src/resources';

const { ChatGPTSimulator, buildDevSimulations } = chatgpt;

// Build simulations from discovered files
const simulations = buildDevSimulations({
  simulationModules: import.meta.glob('../tests/simulations/*/*-simulation.json', { eager: true }),
  resourceModules: import.meta.glob('../src/resources/*/*-resource.tsx', { eager: true }),
  resourceComponents: resourceComponents as Record<string, React.ComponentType>,
});

// Read app config from environment or use defaults
const appName = import.meta.env?.VITE_APP_NAME || 'Sunpeak';
const appIcon = import.meta.env?.VITE_APP_ICON || '🌄';

// Reuse existing React root across HMR updates to avoid full page reload
// when resource files change (they have mixed exports that disable Fast Refresh)
const root = import.meta.hot?.data?.root ?? createRoot(document.getElementById('root')!);
if (import.meta.hot) import.meta.hot.data.root = root;

root.render(
  <StrictMode>
    <ChatGPTSimulator simulations={simulations} appName={appName} appIcon={appIcon} />
  </StrictMode>
);

if (import.meta.hot) {
  import.meta.hot.accept();
}
