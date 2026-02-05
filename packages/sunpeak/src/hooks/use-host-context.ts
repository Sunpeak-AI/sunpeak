import { useCallback, useSyncExternalStore } from 'react';
import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { applyDocumentTheme } from '@modelcontextprotocol/ext-apps';

/**
 * Per-app subscriber registry.
 * The App class only supports a single onhostcontextchanged callback,
 * so we multiplex it to allow multiple hook instances to subscribe.
 *
 * Also applies `data-theme` and `color-scheme` to the document element
 * so that CSS selectors like `[data-theme="dark"]` and Tailwind's `dark:`
 * variant work automatically.
 */
const registries = new WeakMap<App, Set<() => void>>();

function getRegistry(app: App): Set<() => void> {
  let subs = registries.get(app);
  if (!subs) {
    subs = new Set();
    registries.set(app, subs);

    // Apply initial theme from the host context received during initialization
    const ctx = app.getHostContext();
    if (ctx?.theme) {
      applyDocumentTheme(ctx.theme);
    }

    app.onhostcontextchanged = (params) => {
      // Apply theme to document when host changes it
      if (params.theme) {
        applyDocumentTheme(params.theme);
      }
      for (const fn of subs!) fn();
    };
  }
  return subs;
}

/**
 * Reactive access to the MCP Apps host context.
 * Subscribes to host context changes and re-renders when the context updates.
 *
 * @param app - The MCP App instance (from useApp).
 * @returns The current host context, or null if not connected.
 */
export function useHostContext(app: App | null): McpUiHostContext | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!app) return () => {};
      const subs = getRegistry(app);
      subs.add(onChange);
      return () => {
        subs.delete(onChange);
      };
    },
    [app]
  );

  const getSnapshot = useCallback(() => {
    return app?.getHostContext() ?? null;
  }, [app]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
