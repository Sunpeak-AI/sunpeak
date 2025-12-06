/**
 * Internal development server entry point
 * This file is imported by Vite and bootstraps the ChatGPT simulator
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatGPTSimulator, type Simulation } from '../index';

// Dynamically import user's simulations and resources using Vite's resolution
// @ts-expect-error - These are resolved from the user's project via Vite aliases
import { SIMULATIONS } from '/src/simulations';
// @ts-expect-error - Resolved from user's project
import * as Resources from '/src/components/resources';
import '/src/styles/globals.css';

/**
 * Extract the resource component name from a URI
 * Example: 'ui://CounterResource' -> 'CounterResource'
 */
function getResourceComponentFromURI(uri: string): React.ComponentType {
  const match = uri.match(/^ui:\/\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid resource URI format: ${uri}. Expected format: ui://ComponentName`);
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
const simulations: Simulation[] = Object.values(
  SIMULATIONS as Record<string, Omit<Simulation, 'resourceComponent'>>
).map((simulation) => ({
  ...simulation,
  resourceComponent: getResourceComponentFromURI(simulation.resource.uri),
}));

// Read app config from package.json or use defaults
const appName = import.meta.env?.VITE_APP_NAME || 'Sunpeak App';
const appIcon = import.meta.env?.VITE_APP_ICON || '🌄';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatGPTSimulator simulations={simulations} appName={appName} appIcon={appIcon} />
  </StrictMode>
);
