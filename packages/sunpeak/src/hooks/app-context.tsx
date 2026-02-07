/**
 * React Context for sharing the MCP App instance across the component tree.
 *
 * AppProvider handles connecting to the MCP Apps host and provides the App
 * instance via context. All sunpeak hooks read from this context internally,
 * so consumers never need to pass `app` as a parameter.
 *
 * The provider preserves the App instance across React Fast Refresh (HMR)
 * by storing it at module scope, matching the previous useApp() behavior.
 */
import { createContext, useState, useEffect, type ReactNode } from 'react';
import { App, PostMessageTransport } from '@modelcontextprotocol/ext-apps';

export interface AppProviderProps {
  appInfo: { name: string; version: string };
  capabilities?: Record<string, unknown>;
  onAppCreated?: (app: App) => void;
  children: ReactNode;
}

export interface AppState {
  app: App | null;
  isConnected: boolean;
  error: Error | null;
}

const defaultState: AppState = { app: null, isConnected: false, error: null };

export const AppContext = createContext<AppState>(defaultState);

// Module-level App persistence.
// During React Fast Refresh the component file is hot-swapped but this module
// is NOT re-evaluated, so these variables survive across HMR cycles.
// On a full page reload they reset to null, triggering a fresh connection.
let _app: App | null = null;
let _connecting: Promise<App> | null = null;

export function AppProvider({ appInfo, capabilities, onAppCreated, children }: AppProviderProps) {
  const [state, setState] = useState<AppState>(() =>
    _app ? { app: _app, isConnected: true, error: null } : defaultState
  );

  useEffect(() => {
    let cancelled = false;

    // Already connected (HMR re-run or StrictMode double-mount) — reuse.
    if (_app) {
      setState({ app: _app, isConnected: true, error: null });
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
          setState({ app: connectedApp, isConnected: true, error: null });
        }
      },
      (err) => {
        _connecting = null;
        if (!cancelled) {
          setState({
            app: null,
            isConnected: false,
            error: err instanceof Error ? err : new Error('Failed to connect'),
          });
        }
      }
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- connect once, persist across HMR
  }, []);

  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}
