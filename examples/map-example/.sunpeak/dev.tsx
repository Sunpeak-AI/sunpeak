/// <reference types="vite/client" />
/**
 * Bootstrap file for Sunpeak dev server
 * This file bootstraps the multi-host simulator for development.
 *
 * Auto-discovers simulations and resources by file naming convention:
 * - tests/simulations/*.json
 * - src/resources/{resource}/{resource}.tsx (component + resource metadata)
 * - src/resources/{resource}/{Resource}Resource component (PascalCase)
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { simulator } from 'sunpeak';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import '../src/styles/globals.css';
import resourceComponents from '../src/resources';

const { Simulator, buildDevSimulations } = simulator;

// Compile-time flags injected by sunpeak dev (via Vite define)
declare const __SUNPEAK_LIVE__: boolean;
declare const __SUNPEAK_BUILT__: boolean;

// Build simulations from discovered files
const simulations = buildDevSimulations({
  simulationModules: import.meta.glob('../tests/simulations/*.json', { eager: true }),
  resourceComponents: resourceComponents as Record<string, React.ComponentType>,
  toolModules: import.meta.glob('../src/tools/*.ts', { eager: true }),
  resourceModules: import.meta.glob(
    ['../src/resources/*/*.tsx', '!../src/resources/*/*.test.tsx'],
    { eager: true }
  ),
});

// --built: Override resource URLs to use production-built HTML from dist/
if (__SUNPEAK_BUILT__) {
  for (const sim of Object.values(simulations)) {
    if (sim.resource && sim.resourceUrl) {
      const resourceName = sim.resource.name as string;
      sim.resourceUrl = `/dist/${resourceName}/${resourceName}.html`;
    }
  }
}

// Forward callServerTool to real handlers via dev server endpoint.
// Always available — the Live checkbox in the sidebar controls whether it's used.
const onCallTool = async (params: {
  name: string;
  arguments?: Record<string, unknown>;
}): Promise<CallToolResult> => {
  const res = await fetch('/__sunpeak/call-tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
};

// Read app config from environment or use defaults
const appName = import.meta.env?.VITE_APP_NAME || 'Sunpeak';
const appIcon = import.meta.env?.VITE_APP_ICON || '🌄';

// Reuse existing React root across HMR updates to avoid full page reload
// when resource files change (they have mixed exports that disable Fast Refresh)
const root = import.meta.hot?.data?.root ?? createRoot(document.getElementById('root')!);
if (import.meta.hot) import.meta.hot.data.root = root;

root.render(
  <StrictMode>
    <Simulator
      simulations={simulations}
      appName={appName}
      appIcon={appIcon}
      onCallTool={onCallTool}
      defaultLive={__SUNPEAK_LIVE__}
    />
  </StrictMode>
);

if (import.meta.hot) {
  import.meta.hot.accept();
}
