/**
 * Dev resource loader - mounts a single resource component in an iframe.
 *
 * This file is loaded by the dev server when the simulator embeds a resource
 * in an iframe. It reads the component name from the URL query parameter and
 * dynamically imports/mounts it.
 *
 * The resource uses the SDK's useApp() which connects via PostMessageTransport
 * to the parent window (the simulator).
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import resourceComponents from '../src/resources';
import '../src/styles/globals.css';

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
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <Component />
      </StrictMode>
    );
  }
}
