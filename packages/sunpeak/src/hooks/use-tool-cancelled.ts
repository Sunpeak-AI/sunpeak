import { useCallback, useSyncExternalStore } from 'react';
import type { App } from '@modelcontextprotocol/ext-apps';

/**
 * Tool cancellation information.
 */
export interface ToolCancelled {
  /** Whether the tool was cancelled */
  cancelled: true;
  /** Optional reason for cancellation */
  reason?: string;
}

// Per-app store for cancellation state
interface CancelledStore {
  data: ToolCancelled | null;
  listeners: Set<() => void>;
}

const stores = new WeakMap<App, CancelledStore>();

function getStore(app: App): CancelledStore {
  let store = stores.get(app);
  if (!store) {
    store = {
      data: null,
      listeners: new Set(),
    };
    stores.set(app, store);

    const notify = () => {
      for (const fn of store!.listeners) fn();
    };

    app.ontoolcancelled = (params) => {
      store!.data = { cancelled: true, reason: params.reason };
      notify();
    };
  }
  return store;
}

/**
 * Hook to detect when a tool call has been cancelled.
 *
 * Returns cancellation info when the host cancels an in-progress tool call.
 * Use this to clean up resources or show cancellation feedback.
 *
 * @param app - The MCP App instance (from useApp).
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const { app } = useApp({ appInfo, capabilities });
 *   const cancelled = useToolCancelled(app);
 *
 *   useEffect(() => {
 *     if (cancelled) {
 *       // Clean up any in-progress operations
 *       abortController.abort();
 *     }
 *   }, [cancelled]);
 *
 *   if (cancelled) {
 *     return <div>Operation cancelled: {cancelled.reason}</div>;
 *   }
 *
 *   return <div>Working...</div>;
 * }
 * ```
 */
export function useToolCancelled(app: App | null): ToolCancelled | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!app) return () => {};
      const store = getStore(app);
      store.listeners.add(onChange);
      return () => {
        store.listeners.delete(onChange);
      };
    },
    [app]
  );

  const getSnapshot = useCallback(() => {
    if (!app) return null;
    return getStore(app).data;
  }, [app]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
