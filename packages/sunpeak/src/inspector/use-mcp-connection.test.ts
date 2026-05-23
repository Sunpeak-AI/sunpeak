import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMcpConnection } from './use-mcp-connection';

describe('useMcpConnection', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('starts disconnected when no serverUrl', () => {
    const { result } = renderHook(() => useMcpConnection(undefined));
    expect(result.current.status).toBe('disconnected');
  });

  it('transitions to connected on successful health check', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('{"tools":[]}', { status: 200 }));

    const { result } = renderHook(() => useMcpConnection('http://localhost:8000/mcp'));

    // Starts connecting
    expect(result.current.status).toBe('connecting');

    // Transitions to connected
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });
  });

  it('transitions to error on failed health check', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('', { status: 500 }));

    const { result } = renderHook(() => useMcpConnection('http://localhost:8000/mcp'));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toContain('500');
    });
  });

  it('transitions to error on network failure', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useMcpConnection('http://localhost:8000/mcp'));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Network error');
    });
  });

  it('reconnect calls /__sunpeak/connect and updates status', async () => {
    // Initial health check succeeds
    fetchSpy.mockResolvedValueOnce(new Response('{"tools":[]}', { status: 200 }));

    const { result } = renderHook(() => useMcpConnection('http://localhost:8000/mcp'));

    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    // Reconnect succeeds
    fetchSpy.mockResolvedValueOnce(new Response('{"status":"ok"}', { status: 200 }));

    await act(() => result.current.reconnect('http://localhost:9000/mcp'));

    expect(result.current.status).toBe('connected');
    expect(fetchSpy).toHaveBeenCalledWith(
      '/__sunpeak/connect',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ url: 'http://localhost:9000/mcp' }),
      })
    );
  });

  it('uses the configured inspector API base URL and resolves resource URLs', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('{"tools":[]}', { status: 200 }));

    const { result } = renderHook(() =>
      useMcpConnection('http://localhost:8000/mcp', 'https://preview.example/api')
    );

    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    expect(fetchSpy).toHaveBeenCalledWith('https://preview.example/api/__sunpeak/list-tools');

    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'ok',
          simulations: {
            tool: {
              name: 'tool',
              resourceUrl: '/__sunpeak/read-resource?uri=ui%3A%2F%2Ftool',
            },
          },
        }),
        { status: 200 }
      )
    );

    await act(() => result.current.reconnect('http://localhost:9000/mcp'));

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://preview.example/api/__sunpeak/connect',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ url: 'http://localhost:9000/mcp' }),
      })
    );
    expect(result.current.simulations?.tool).toMatchObject({
      resourceUrl: 'https://preview.example/api/__sunpeak/read-resource?uri=ui%3A%2F%2Ftool',
    });
  });

  it('reconnect sends auth config in the request body', async () => {
    // Initial health check succeeds
    fetchSpy.mockResolvedValueOnce(new Response('{"tools":[]}', { status: 200 }));

    const { result } = renderHook(() => useMcpConnection('http://localhost:8000/mcp'));

    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    // Reconnect with bearer auth
    fetchSpy.mockResolvedValueOnce(new Response('{"status":"ok"}', { status: 200 }));

    await act(() =>
      result.current.reconnect('http://localhost:9000/mcp', {
        type: 'bearer',
        bearerToken: 'my-token',
      })
    );

    expect(result.current.status).toBe('connected');
    expect(fetchSpy).toHaveBeenCalledWith(
      '/__sunpeak/connect',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          url: 'http://localhost:9000/mcp',
          auth: { type: 'bearer', bearerToken: 'my-token' },
        }),
      })
    );
  });

  it('reconnect omits auth config when type is none', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('{"tools":[]}', { status: 200 }));

    const { result } = renderHook(() => useMcpConnection('http://localhost:8000/mcp'));

    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    fetchSpy.mockResolvedValueOnce(new Response('{"status":"ok"}', { status: 200 }));

    await act(() => result.current.reconnect('http://localhost:9000/mcp', { type: 'none' }));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/__sunpeak/connect',
      expect.objectContaining({
        body: JSON.stringify({ url: 'http://localhost:9000/mcp' }),
      })
    );
  });

  it('setConnected transitions to connected with simulations', async () => {
    const { result } = renderHook(() => useMcpConnection(undefined));
    expect(result.current.status).toBe('disconnected');

    const sims = { 'my-tool': { name: 'my-tool' } };
    act(() => result.current.setConnected(sims));

    expect(result.current.status).toBe('connected');
    expect(result.current.simulations).toBe(sims);
    expect(result.current.hasReconnected).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('setConnected resolves resource URLs with the configured inspector API base URL', () => {
    const { result } = renderHook(() => useMcpConnection(undefined, 'https://preview.example/api'));

    act(() =>
      result.current.setConnected({
        tool: {
          name: 'tool',
          resourceUrl: '/__sunpeak/read-resource?uri=ui%3A%2F%2Ftool',
        },
      })
    );

    expect(result.current.simulations?.tool).toMatchObject({
      resourceUrl: 'https://preview.example/api/__sunpeak/read-resource?uri=ui%3A%2F%2Ftool',
    });
  });

  it('reconnect transitions to error on failure', async () => {
    // Initial health check succeeds
    fetchSpy.mockResolvedValueOnce(new Response('{"tools":[]}', { status: 200 }));

    const { result } = renderHook(() => useMcpConnection('http://localhost:8000/mcp'));

    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    // Reconnect fails
    fetchSpy.mockResolvedValueOnce(new Response('Server unavailable', { status: 503 }));

    await act(() => result.current.reconnect('http://localhost:9000/mcp'));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBeTruthy();
    });
  });
});
