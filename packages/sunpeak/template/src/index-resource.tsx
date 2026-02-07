import '../src/styles/globals.css';
// Import sunpeak to ensure simulator styles are included via side-effect
import 'sunpeak';
// @ts-expect-error - Template file with placeholders
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createRoot } from 'react-dom/client';
// @ts-expect-error - Template file with placeholders
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AppProvider } from 'sunpeak';
// RESOURCE_IMPORT

// Mount the resource
const root = document.getElementById('root');
if (root) {
  // RESOURCE_MOUNT
}
