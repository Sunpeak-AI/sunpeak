import { useState, useEffect, useCallback } from 'react';

export interface McpConnectionState {
  /** Current connection status */
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  /** Error message if status is 'error' */
  error?: string;
  /** Verify the server connection is alive. */
  reconnect: (url: string) => Promise<void>;
}

/**
 * Hook for managing MCP server connection status via the dev server proxy.
 *
 * On mount (when `serverUrl` is provided), verifies the connection is alive
 * by fetching `/__sunpeak/list-tools`. Tracks connection status for display
 * in the sidebar (colored dot indicator).
 *
 * Tool calling is handled separately via the `onCallTool` prop — this
 * hook only manages the connection lifecycle and status display.
 */
export function useMcpConnection(serverUrl: string | undefined): McpConnectionState {
  const [status, setStatus] = useState<McpConnectionState['status']>(
    serverUrl ? 'connecting' : 'disconnected'
  );
  const [error, setError] = useState<string | undefined>();

  const reconnect = useCallback(async (url: string) => {
    setStatus('connecting');
    setError(undefined);
    try {
      const res = await fetch('/__sunpeak/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Connection failed (${res.status})`);
      }
      setStatus('connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus('error');
    }
  }, []);

  // Connect on mount when serverUrl is provided
  useEffect(() => {
    if (!serverUrl) {
      setStatus('disconnected');
      return;
    }
    // Initial connection — the inspect server already connected at startup,
    // so we just verify the connection is alive via list-tools.
    let cancelled = false;
    (async () => {
      setStatus('connecting');
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
  }, [serverUrl]);

  return { status, error, reconnect };
}
