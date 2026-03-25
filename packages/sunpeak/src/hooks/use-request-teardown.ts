import { useCallback } from 'react';
import { useApp } from './use-app';

/**
 * Hook to request the host to tear down this app.
 *
 * Sends a notification to the host requesting that it initiate teardown.
 * If the host approves, it will send the standard teardown request back
 * to the app (triggering any `useTeardown` callbacks) before unmounting.
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const requestTeardown = useRequestTeardown();
 *
 *   return (
 *     <button onClick={() => requestTeardown()}>
 *       Close App
 *     </button>
 *   );
 * }
 * ```
 */
export function useRequestTeardown(): () => Promise<void> {
  const app = useApp();
  return useCallback(async () => {
    if (!app) {
      console.warn('[useRequestTeardown] App not connected');
      return;
    }
    await app.requestTeardown();
  }, [app]);
}
