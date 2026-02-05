import { useEffect, useRef } from 'react';
import type { App } from '@modelcontextprotocol/ext-apps';

/**
 * Hook to register a cleanup callback before the app is unmounted.
 *
 * The callback runs when the host signals teardown, before the iframe is destroyed.
 * Use this for cleanup that must complete before unmount (e.g., saving state).
 *
 * @param app - The MCP App instance (from useApp).
 * @param callback - Async function to run on teardown.
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const { app } = useApp({ appInfo, capabilities });
 *   const [data, setData] = useState({});
 *
 *   useTeardown(app, async () => {
 *     // Save unsaved changes before unmount
 *     await saveToServer(data);
 *   });
 *
 *   return <Editor data={data} onChange={setData} />;
 * }
 * ```
 */
export function useTeardown(app: App | null, callback: () => Promise<void> | void): void {
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!app) return;

    // Store the original handler to restore on cleanup
    const originalHandler = app.onteardown;

    // eslint-disable-next-line react-hooks/immutability -- onteardown is a setter on the App class, not a mutation
    app.onteardown = async () => {
      await callbackRef.current();
      return {};
    };

    return () => {
      app.onteardown = originalHandler;
    };
  }, [app]);
}
