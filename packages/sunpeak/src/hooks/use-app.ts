/**
 * HMR-safe useApp hook.
 *
 * Wraps the MCP Apps SDK's App + PostMessageTransport connection in a way
 * that survives React Fast Refresh. The SDK's built-in useApp creates a new
 * App instance every time its effect re-runs, which breaks the host bridge
 * (ChatGPT doesn't handle re-initialization from the same iframe) and loses
 * all runtime state stored in WeakMaps keyed by App (useToolData, useHostContext).
 *
 * Our version stores the connected App at module scope so that when Fast Refresh
 * re-runs the effect, we reuse the existing connection instead of creating a new one.
 */
import { useState, useEffect } from 'react';
import { App, PostMessageTransport } from '@modelcontextprotocol/ext-apps';

export interface UseAppOptions {
  appInfo: { name: string; version: string };
  capabilities?: Record<string, unknown>;
  onAppCreated?: (app: App) => void;
}

export interface AppState {
  app: App | null;
  isConnected: boolean;
  error: Error | null;
}

// Module-level App persistence.
// During React Fast Refresh the component file is hot-swapped but this module
// (use-app.ts) is NOT re-evaluated, so these variables survive across HMR cycles.
// On a full page reload they reset to null, triggering a fresh connection.
let _app: App | null = null;
let _connecting: Promise<App> | null = null;

export function useApp(options: UseAppOptions): AppState {
  const { appInfo, capabilities, onAppCreated } = options;

  const [app, setApp] = useState<App | null>(_app);
  const [isConnected, setIsConnected] = useState(_app != null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Already connected (HMR re-run or StrictMode double-mount) — reuse.
    if (_app) {
      setApp(_app);
      setIsConnected(true);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    // Connection already in flight (StrictMode double-mount) — wait for it.
    if (!_connecting) {
      _connecting = (async () => {
        const transport = new PostMessageTransport(window.parent, window.parent);
        const newApp = new App(appInfo, capabilities ?? {});
        onAppCreated?.(newApp);
        await newApp.connect(transport);
        _app = newApp;
        return newApp;
      })();
    }

    _connecting.then(
      (connectedApp) => {
        if (!cancelled) {
          setApp(connectedApp);
          setIsConnected(true);
          setError(null);
        }
      },
      (err) => {
        _connecting = null;
        if (!cancelled) {
          setApp(null);
          setIsConnected(false);
          setError(err instanceof Error ? err : new Error('Failed to connect'));
        }
      }
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- connect once, persist across HMR
  }, []);

  return { app, isConnected, error };
}
