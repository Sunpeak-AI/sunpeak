/**
 * Bootstrap file for Sunpeak dev server
 * This file bootstraps the ChatGPT simulator for development
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatGPTSimulator, type Simulation } from 'sunpeak';
import { SIMULATIONS } from '../src/simulations';
import * as Resources from '../src/resources';
import '../src/styles/globals.css';

/**
 * Convert resource name to component name
 * Example: 'carousel' -> 'CarouselResource', 'counter' -> 'CounterResource'
 */
function getResourceComponentFromName(name: string): React.ComponentType {
  // Convert name to PascalCase and append 'Resource'
  const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
  const componentName = `${pascalName}Resource`;

  const component = Resources[componentName as keyof typeof Resources];

  if (!component) {
    throw new Error(
      `Resource component "${componentName}" not found for resource "${name}". ` +
        `Make sure it's exported from src/resources/index.ts`
    );
  }

  return component as React.ComponentType;
}

// Package the resource component with the simulation
const simulations: Simulation[] = Object.values(
  SIMULATIONS as Record<string, Omit<Simulation, 'resourceComponent'>>
).map((simulation) => ({
  ...simulation,
  resourceComponent: getResourceComponentFromName(simulation.resource.name),
}));

// Read app config from package.json or use defaults
const appName = import.meta.env?.VITE_APP_NAME || 'Sunpeak';
const appIcon = import.meta.env?.VITE_APP_ICON || '🌄';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatGPTSimulator simulations={simulations} appName={appName} appIcon={appIcon} />
  </StrictMode>
);
