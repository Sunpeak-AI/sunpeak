/// <reference types="vite/client" />
/**
 * Bootstrap file for Sunpeak dev server
 * This file bootstraps the ChatGPT simulator for development
 *
 * Auto-discovers simulations and resources by file naming convention:
 * - tests/simulations/{resource}/{resource}-{scenario}-simulation.json
 * - src/resources/{resource}/{resource}-resource.json
 * - src/resources/{resource}/{Resource}Resource component (PascalCase)
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatGPTSimulator, buildDevSimulations } from 'sunpeak';
import resourceComponents from '../src/resources';
import '../src/styles/globals.css';

// Build simulations from discovered files
const simulations = buildDevSimulations({
  simulationModules: import.meta.glob('../tests/simulations/*/*-simulation.json', { eager: true }),
  resourceModules: import.meta.glob('../src/resources/*/*-resource.json', { eager: true }),
  resourceComponents: resourceComponents as Record<string, React.ComponentType>,
});

// Read app config from environment or use defaults
const appName = import.meta.env?.VITE_APP_NAME || 'Sunpeak';
const appIcon = import.meta.env?.VITE_APP_ICON || '🌄';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatGPTSimulator simulations={simulations} appName={appName} appIcon={appIcon} />
  </StrictMode>
);
