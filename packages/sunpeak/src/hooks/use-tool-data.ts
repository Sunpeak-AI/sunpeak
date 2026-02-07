import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import type { App } from '@modelcontextprotocol/ext-apps';
import { useApp } from './use-app';

export interface ToolData<TInput = unknown, TOutput = unknown> {
  input: TInput | null;
  inputPartial: TInput | null;
  output: TOutput | null;
  isError: boolean;
  isLoading: boolean;
  isCancelled: boolean;
  cancelReason: string | null;
}

interface ToolDataStore<TInput, TOutput> {
  data: ToolData<TInput, TOutput>;
  listeners: Set<() => void>;
}

const stores = new WeakMap<App, ToolDataStore<unknown, unknown>>();

function getStore<TInput, TOutput>(
  app: App,
  defaultInput?: TInput,
  defaultOutput?: TOutput
): ToolDataStore<TInput, TOutput> {
  let store = stores.get(app) as ToolDataStore<TInput, TOutput> | undefined;
  if (!store) {
    store = {
      data: {
        input: defaultInput ?? null,
        inputPartial: null,
        output: defaultOutput ?? null,
        isError: false,
        isLoading: !defaultOutput,
        isCancelled: false,
        cancelReason: null,
      },
      listeners: new Set(),
    };
    stores.set(app, store as ToolDataStore<unknown, unknown>);

    const notify = () => {
      for (const fn of store!.listeners) fn();
    };

    app.ontoolinput = (_params) => {
      store!.data = {
        ...store!.data,
        input: _params.arguments as TInput,
        inputPartial: null,
      };
      notify();
    };

    app.ontoolinputpartial = (_params) => {
      store!.data = {
        ...store!.data,
        inputPartial: _params.arguments as TInput,
      };
      notify();
    };

    app.ontoolresult = (_params) => {
      store!.data = {
        ...store!.data,
        output: (_params.structuredContent ?? _params.content) as TOutput,
        isError: _params.isError ?? false,
        isLoading: false,
      };
      notify();
    };

    app.ontoolcancelled = (_params) => {
      store!.data = {
        ...store!.data,
        isCancelled: true,
        cancelReason: _params.reason ?? null,
        isLoading: false,
      };
      notify();
    };
  }
  return store;
}

/**
 * Reactive access to tool input and output data from the MCP Apps host.
 *
 * @param defaultInput - Optional default input value before host sends data.
 * @param defaultOutput - Optional default output value before host sends data.
 */
export function useToolData<TInput = unknown, TOutput = unknown>(
  defaultInput?: TInput,
  defaultOutput?: TOutput
): ToolData<TInput, TOutput> {
  const app = useApp();
  const defaultInputRef = useRef(defaultInput);
  const defaultOutputRef = useRef(defaultOutput);

  // Cache the null-app snapshot so getSnapshot returns a stable reference.
  // useSyncExternalStore compares with Object.is — a new object each call
  // would cause an infinite re-render loop.
  const nullSnapshot = useMemo<ToolData<TInput, TOutput>>(
    () => ({
      input: defaultInput ?? null,
      inputPartial: null,
      output: defaultOutput ?? null,
      isError: false,
      isLoading: !defaultOutput,
      isCancelled: false,
      cancelReason: null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Intentionally empty - only compute once on first render
  );

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!app) return () => {};
      const store = getStore<TInput, TOutput>(
        app,
        defaultInputRef.current,
        defaultOutputRef.current
      );
      store.listeners.add(onChange);
      return () => {
        store.listeners.delete(onChange);
      };
    },
    [app]
  );

  const getSnapshot = useCallback((): ToolData<TInput, TOutput> => {
    if (!app) {
      return nullSnapshot;
    }
    return getStore<TInput, TOutput>(app, defaultInputRef.current, defaultOutputRef.current).data;
  }, [app, nullSnapshot]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
