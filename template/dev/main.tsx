import '../src/styles/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatGPTSimulator, type Simulation } from 'sunpeak';
import { SIMULATIONS } from '../src/simulations';
import * as Resources from '../src/components/resources';

/**
 * Extract the resource component name from a URI
 * Example: 'ui://CounterResource.tsx' -> 'CounterResource'
 */
function getResourceComponentFromURI(uri: string): React.ComponentType {
  // Extract component name from URI pattern: ui://ComponentName.tsx
  const match = uri.match(/^ui:\/\/(.+)\.tsx$/);
  if (!match) {
    throw new Error(`Invalid resource URI format: ${uri}. Expected format: ui://ComponentName.tsx`);
  }

  const componentName = match[1];
  const component = Resources[componentName as keyof typeof Resources];

  if (!component) {
    throw new Error(
      `Resource component "${componentName}" not found. ` +
      `Make sure it's exported from src/components/resources/index.ts`
    );
  }

  return component as React.ComponentType;
}

// Package the resource component with the simulation
const simulations: Simulation[] = Object.values(SIMULATIONS).map((simulation) => ({
  ...simulation,
  resourceComponent: getResourceComponentFromURI(simulation.resource.uri),
}));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatGPTSimulator
      simulations={simulations}
      appName="Sunpeak App"
      appIcon="🌄"
    />
  </StrictMode>
);
