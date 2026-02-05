import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import type { App } from '@modelcontextprotocol/ext-apps';

/**
 * State management with automatic sync to host via updateModelContext.
 *
 * This hook provides React-like state management that automatically sends
 * state updates to the host via `app.updateModelContext()`. The host can
 * then include this state in the model's context for the next message.
 *
 * Works with any MCP Apps host that supports the updateModelContext capability.
 *
 * @example Basic usage
 * ```tsx
 * import { useAppState } from 'sunpeak';
 *
 * function MyResource() {
 *   const { app } = useApp({ appInfo, capabilities });
 *   const [state, setState] = useAppState(app, { count: 0 });
 *
 *   return (
 *     <button onClick={() => setState(prev => ({ ...prev, count: prev.count + 1 }))}>
 *       Count: {state.count}
 *     </button>
 *   );
 * }
 * ```
 *
 * @example With typed state
 * ```tsx
 * interface MyState {
 *   selectedId: string | null;
 *   items: string[];
 * }
 *
 * const [state, setState] = useAppState<MyState>(app, {
 *   selectedId: null,
 *   items: [],
 * });
 * ```
 *
 * @param app - The MCP App instance (from useApp).
 * @param defaultState - Initial state value.
 * @returns A tuple of [state, setState] similar to React's useState.
 */
export function useAppState<T extends Record<string, unknown>>(
  app: App | null,
  defaultState: T
): readonly [T, (state: SetStateAction<T>) => void] {
  const [state, _setState] = useState<T>(defaultState);
  const pendingSync = useRef<T | null>(null);

  // Listen for debug state injection from simulator (sunpeak/injectState message).
  // This is a debug feature that allows the simulator to inject state changes
  // without going through the normal MCP Apps protocol flow.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (event: MessageEvent) => {
      // Only accept messages from parent (simulator)
      if (event.source !== window.parent) return;

      const data = event.data;
      if (
        data &&
        typeof data === 'object' &&
        data.method === 'sunpeak/injectState' &&
        data.params?.state != null
      ) {
        _setState(data.params.state as T);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Flush pending state to host after render completes
  useEffect(() => {
    if (pendingSync.current != null && app) {
      const value = pendingSync.current;
      pendingSync.current = null;
      app
        .updateModelContext({
          structuredContent: value,
        })
        .catch(() => {
          // Silently ignore — host may not support updateModelContext
        });
    }
  });

  const setState = useCallback((action: SetStateAction<T>) => {
    _setState((prev) => {
      const next = typeof action === 'function' ? (action as (prev: T) => T)(prev) : action;
      pendingSync.current = next;
      return next;
    });
  }, []);

  return [state, setState] as const;
}
