import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { App } from '@modelcontextprotocol/ext-apps';
import { AppContext } from './app-context';
import { useToolData } from './use-tool-data';
import { initToolDataStore } from './tool-data-store';
import type { ReactNode } from 'react';

function fakeApp(): App {
  return {} as unknown as App;
}

function wrapper(app: App | null) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AppContext.Provider value={{ app, isConnected: !!app, error: null }}>
        {children}
      </AppContext.Provider>
    );
  };
}

describe('useToolData eager-store integration', () => {
  it('picks up a tool result that arrived before the component mounted', () => {
    const app = fakeApp();
    initToolDataStore(app);
    // Host fires the result before any React commit — the bug this PR fixes.
    app.ontoolresult!({
      structuredContent: { greeting: 'hello' },
      content: [],
      isError: false,
    });

    const { result } = renderHook(() => useToolData(), {
      wrapper: wrapper(app),
    });

    expect(result.current.output).toEqual({ greeting: 'hello' });
    expect(result.current.isLoading).toBe(false);
  });

  it('re-renders when a notification arrives after the component mounted', () => {
    const app = fakeApp();
    initToolDataStore(app);

    const { result } = renderHook(() => useToolData(), {
      wrapper: wrapper(app),
    });

    expect(result.current.output).toBeNull();
    expect(result.current.isLoading).toBe(true);

    act(() => {
      app.ontoolresult!({
        structuredContent: { greeting: 'late' },
        content: [],
        isError: false,
      });
    });

    expect(result.current.output).toEqual({ greeting: 'late' });
    expect(result.current.isLoading).toBe(false);
  });

  it('falls back to a lazy WeakMap store when no eager store is attached', () => {
    // App created outside AppProvider — e.g. in tests or direct SDK usage.
    const app = fakeApp();
    expect(app.__toolDataStore).toBeUndefined();

    const { result } = renderHook(() => useToolData(), {
      wrapper: wrapper(app),
    });

    expect(result.current.output).toBeNull();
    expect(result.current.isLoading).toBe(true);

    act(() => {
      app.ontoolresult!({
        structuredContent: { lazy: true },
        content: [],
        isError: false,
      });
    });

    expect(result.current.output).toEqual({ lazy: true });
  });

  it('applies useToolData defaults to an empty eager store', () => {
    const app = fakeApp();
    initToolDataStore(app);

    const { result } = renderHook(
      () => useToolData<{ q: string }, { items: string[] }>({ q: 'seed' }, { items: ['a'] }),
      { wrapper: wrapper(app) }
    );

    expect(result.current.input).toEqual({ q: 'seed' });
    expect(result.current.output).toEqual({ items: ['a'] });
    expect(result.current.isLoading).toBe(false);
  });
});
