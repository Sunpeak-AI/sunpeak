/// <reference types="vite/client" />
/**
 * Dev resource loader - mounts a single resource component in an iframe.
 *
 * This file is loaded by the dev server when the simulator embeds a resource
 * in an iframe. It reads the component name from the URL query parameter and
 * dynamically imports/mounts it.
 *
 * The AppProvider handles connecting to the parent window (the simulator)
 * via PostMessageTransport.
 *
 * Resource files export both React components and config objects, which
 * disables Vite's React Fast Refresh (it requires component-only exports).
 * We handle HMR manually here by reusing the React root across updates,
 * which keeps the iframe alive and preserves the PostMessage connection.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from 'sunpeak';
import '../src/styles/globals.css';
import resourceComponents from '../src/resources';

// Get the component name from URL query params
const params = new URLSearchParams(window.location.search);
const componentName = params.get('component');

if (!componentName) {
  document.body.innerHTML =
    '<div style="color: red; padding: 20px;">Error: No component specified. Use ?component=ComponentName</div>';
} else {
  const Component = (resourceComponents as Record<string, React.ComponentType>)[componentName];

  if (!Component) {
    document.body.innerHTML = `<div style="color: red; padding: 20px;">Error: Component "${componentName}" not found. Available: ${Object.keys(resourceComponents).join(', ')}</div>`;
  } else {
    // Reuse existing React root across HMR updates to preserve the app connection
    const root = import.meta.hot?.data?.root ?? createRoot(document.getElementById('root')!);
    if (import.meta.hot) import.meta.hot.data.root = root;

    root.render(
      <StrictMode>
        <AppProvider appInfo={{ name: componentName, version: '1.0.0' }}>
          <Component />
        </AppProvider>
      </StrictMode>
    );
  }
}

// Accept HMR updates manually since resource files have mixed exports
// (component + config object) which disables React Fast Refresh.
// On update, the module re-executes with the latest imports and re-renders
// into the persisted root, avoiding a full iframe reload.
if (import.meta.hot) {
  import.meta.hot.accept();
}
