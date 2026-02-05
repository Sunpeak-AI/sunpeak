import { useCallback, useSyncExternalStore } from 'react';
import type { App } from '@modelcontextprotocol/ext-apps';

/**
 * Partial tool input received during streaming.
 */
export interface ToolInputPartial {
  /** Partial arguments received so far */
  arguments?: Record<string, unknown>;
}

// Per-app store for partial input
interface PartialStore {
  data: ToolInputPartial | null;
  listeners: Set<() => void>;
}

const stores = new WeakMap<App, PartialStore>();

function getStore(app: App): PartialStore {
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

    app.ontoolinputpartial = (params) => {
      store!.data = params;
      notify();
    };
  }
  return store;
}

/**
 * Hook to receive streaming partial tool input.
 *
 * Returns the latest partial arguments as they stream in during a tool call.
 * Useful for showing progress or previews while the model is still generating.
 *
 * @param app - The MCP App instance (from useApp).
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const { app } = useApp({ appInfo, capabilities });
 *   const partialInput = useToolInputPartial(app);
 *   const { input } = useToolData(app);
 *
 *   // Show partial data while streaming, final data when complete
 *   const currentData = input ?? partialInput?.arguments;
 *
 *   return (
 *     <div>
 *       {!input && partialInput && <span>Streaming...</span>}
 *       <pre>{JSON.stringify(currentData, null, 2)}</pre>
 *     </div>
 *   );
 * }
 * ```
 */
export function useToolInputPartial(app: App | null): ToolInputPartial | null {
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
