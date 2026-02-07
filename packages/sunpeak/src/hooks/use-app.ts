import { useContext } from 'react';
import { AppContext } from './app-context';
import type { App } from '@modelcontextprotocol/ext-apps';

/**
 * Access the MCP App instance from context.
 *
 * Returns the connected App instance, or `null` while the connection
 * is being established. Must be used inside an `<AppProvider>`.
 *
 * Most hooks read from context internally, so you only need `useApp()`
 * for direct SDK method calls like `app.requestDisplayMode()`.
 *
 * @example
 * ```tsx
 * import { useApp } from 'sunpeak';
 *
 * function MyComponent() {
 *   const app = useApp();
 *   const handleFullscreen = () => app?.requestDisplayMode({ mode: 'fullscreen' });
 *   return <button onClick={handleFullscreen}>Fullscreen</button>;
 * }
 * ```
 */
export function useApp(): App | null {
  return useContext(AppContext).app;
}
