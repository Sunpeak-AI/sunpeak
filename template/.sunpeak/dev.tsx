/**
 * Bootstrap file for Sunpeak dev server
 * This file bootstraps the ChatGPT simulator for development
 *
 * Auto-discovers simulations and resources by file naming convention:
 * - simulations/{resource}-{tool}-simulation.json (e.g., albums-show-simulation.json)
 * - resources/{resource}-resource.json
 * - resources/{Resource}Resource component (PascalCase)
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatGPTSimulator, type Simulation } from 'sunpeak';
import resourceComponents from '../src/resources';
import '../src/styles/globals.css';

// Auto-discover all simulation and resource JSON files
const simulationModules = import.meta.glob('../src/simulations/*-simulation.json', {
  eager: true,
});
const resourceModules = import.meta.glob('../src/resources/*-resource.json', { eager: true });

// Build resource map from discovered files
type ResourceData = { name: string; [key: string]: unknown };
const resourcesMap = new Map<string, ResourceData>();
for (const [path, module] of Object.entries(resourceModules)) {
  // Extract key from path: '../src/resources/review-resource.json' -> 'review'
  const match = path.match(/\/([^/]+)-resource\.json$/);
  const key = match?.[1];
  if (key) {
    resourcesMap.set(key, (module as { default: ResourceData }).default);
  }
}

// Get sorted resource keys for best-match lookup (longest first)
const resourceKeys = Array.from(resourcesMap.keys()).sort((a, b) => b.length - a.length);

/**
 * Find the best matching resource for a simulation key.
 * Matches the longest resource name that is a prefix of the simulation key.
 * e.g., 'albums-show' matches 'albums' (not 'album' if both exist)
 */
function findResourceKey(simulationKey: string): string | undefined {
  // Simulation key format: {resource}-{tool} (e.g., 'albums-show')
  // Find the longest resource name that matches as a prefix followed by '-'
  for (const resourceKey of resourceKeys) {
    if (simulationKey === resourceKey || simulationKey.startsWith(resourceKey + '-')) {
      return resourceKey;
    }
  }
  return undefined;
}

/**
 * Convert resource name to component name
 * Example: 'carousel' -> 'CarouselResource', 'review' -> 'ReviewResource'
 */
function getResourceComponent(name: string): React.ComponentType {
  const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
  const componentName = `${pascalName}Resource`;

  const component = resourceComponents[componentName];

  if (!component) {
    throw new Error(
      `Resource component "${componentName}" not found for resource "${name}". ` +
        `Make sure src/resources/${name}-resource.tsx exists with a default export.`
    );
  }

  return component;
}

// Build simulations array from discovered files
type SimulationData = Omit<Simulation, 'resourceComponent' | 'resource'>;
const simulations: Simulation[] = [];

for (const [path, module] of Object.entries(simulationModules)) {
  // Extract simulation key from path: '../src/simulations/albums-show-simulation.json' -> 'albums-show'
  const match = path.match(/\/([^/]+)-simulation\.json$/);
  const simulationKey = match?.[1];
  if (!simulationKey) continue;

  const simulation = (module as { default: SimulationData }).default;

  // Find matching resource by best prefix match
  const resourceKey = findResourceKey(simulationKey);
  if (!resourceKey) {
    console.warn(
      `No matching resource found for simulation "${simulationKey}". ` +
        `Expected a resource file like src/resources/${simulationKey.split('-')[0]}-resource.json`
    );
    continue;
  }

  const resource = resourcesMap.get(resourceKey)!;

  simulations.push({
    ...simulation,
    resource,
    resourceComponent: getResourceComponent(resource.name),
  });
}

// Read app config from environment or use defaults
const appName = import.meta.env?.VITE_APP_NAME || 'Sunpeak';
const appIcon = import.meta.env?.VITE_APP_ICON || '🌄';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatGPTSimulator simulations={simulations} appName={appName} appIcon={appIcon} />
  </StrictMode>
);
