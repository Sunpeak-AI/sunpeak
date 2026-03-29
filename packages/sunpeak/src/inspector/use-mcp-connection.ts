import { useState, useEffect, useCallback } from 'react';

export type AuthType = 'none' | 'bearer' | 'oauth';

export interface AuthConfig {
  type: AuthType;
  /** Bearer token (when type === 'bearer') */
  bearerToken?: string;
}

export interface McpConnectionState {
  /** Current connection status */
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  /** Error message if status is 'error' */
  error?: string;
  /** Simulations returned after a successful reconnect (undefined until first reconnect or after a failed reconnect) */
  simulations?: Record<string, unknown>;
  /** True after at least one user-initiated reconnect has been attempted (URL change). */
  hasReconnected: boolean;
  /** Connect to a new MCP server URL. Returns discovered simulations on success. */
  reconnect: (url: string, auth?: AuthConfig) => Promise<void>;
  /** Update connection state after OAuth completes (bypasses /__sunpeak/connect). */
  setConnected: (simulations?: Record<string, unknown>) => void;
}

/**
 * Hook for managing MCP server connection status via the dev server proxy.
 *
 * On mount (when `initialServerUrl` is provided), verifies the connection is alive
 * by fetching `/__sunpeak/list-tools`. URL changes are handled by the caller
 * via `reconnect()`, which posts to `/__sunpeak/connect`.
 *
 * This split avoids React StrictMode issues: the mount-only health check runs
 * once (or safely twice with cancellation), while explicit `reconnect()` calls
 * are triggered by the Inspector's URL-change effect.
 */
export function useMcpConnection(initialServerUrl: string | undefined): McpConnectionState {
  const [status, setStatus] = useState<McpConnectionState['status']>(
    initialServerUrl ? 'connecting' : 'disconnected'
  );
  const [error, setError] = useState<string | undefined>();
  const [simulations, setSimulations] = useState<Record<string, unknown> | undefined>();
  const [hasReconnected, setHasReconnected] = useState(false);

  const reconnect = useCallback(async (url: string, auth?: AuthConfig) => {
    setHasReconnected(true);
    setStatus('connecting');
    setError(undefined);
    try {
      const body: Record<string, unknown> = { url };
      if (auth && auth.type !== 'none') {
        body.auth = auth;
      }
      const res = await fetch('/__sunpeak/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let message: string | undefined;
        try {
          const json = await res.json();
          if (json.error) message = json.error;
        } catch {
          // Response wasn't JSON — fall through to status-based message
        }
        if (!message) {
          if (res.status === 404) {
            message =
              'Server not found at this URL. Check the URL and make sure the server is running.';
          } else if (res.status >= 500) {
            message = `Server error (${res.status}). Check the MCP server logs for details.`;
          } else {
            message = `Connection failed (${res.status})`;
          }
        }
        throw new Error(message);
      }
      const data = await res.json();
      setStatus('connected');
      setSimulations(data.simulations ?? undefined);
    } catch (err) {
      let message = err instanceof Error ? err.message : String(err);
      // fetch throws TypeError on network failure (server not running, DNS, etc.)
      if (err instanceof TypeError && message === 'Failed to fetch') {
        message = 'Cannot reach MCP server. Is it running?';
      }
      setError(message);
      setStatus('error');
      setSimulations(undefined);
    }
  }, []);

  const setConnected = useCallback((sims?: Record<string, unknown>) => {
    setHasReconnected(true);
    setStatus('connected');
    setError(undefined);
    setSimulations(sims);
  }, []);

  // Initial health check (mount-only). Verifies the connection is alive
  // when the component mounts with a pre-configured server URL.
  // In React StrictMode the first invocation is cancelled; the second runs to completion.
  useEffect(() => {
    if (!initialServerUrl) return;
    let cancelled = false;
    setStatus('connecting');
    (async () => {
      try {
        const res = await fetch('/__sunpeak/list-tools');
        if (cancelled) return;
        if (!res.ok) {
          const msg =
            res.status === 404
              ? 'MCP server not reachable. Is it running?'
              : `Health check failed (${res.status}). Check the MCP server logs.`;
          throw new Error(msg);
        }
        setStatus('connected');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount-only — URL changes are handled by the caller via reconnect()

  return { status, error, simulations, hasReconnected, reconnect, setConnected };
}
