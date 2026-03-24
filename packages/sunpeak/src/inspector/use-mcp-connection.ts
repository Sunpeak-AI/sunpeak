import { useState, useEffect, useCallback } from 'react';

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
  reconnect: (url: string) => Promise<void>;
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

  const reconnect = useCallback(async (url: string) => {
    setHasReconnected(true);
    setStatus('connecting');
    setError(undefined);
    try {
      const res = await fetch('/__sunpeak/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        let message = `Connection failed (${res.status})`;
        try {
          const json = await res.json();
          if (json.error) message = json.error;
        } catch {
          // Response wasn't JSON — use default message
        }
        throw new Error(message);
      }
      const data = await res.json();
      setStatus('connected');
      setSimulations(data.simulations ?? undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus('error');
      setSimulations(undefined);
    }
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
        if (!res.ok) throw new Error(`Health check failed (${res.status})`);
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

  return { status, error, simulations, hasReconnected, reconnect };
}
