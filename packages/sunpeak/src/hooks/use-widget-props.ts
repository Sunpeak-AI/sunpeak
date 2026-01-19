import { useWidgetGlobal } from './use-widget-global';

export function useWidgetProps<T extends Record<string, unknown>>(defaultState?: T | (() => T)): T {
  const props = useWidgetGlobal('toolOutput') as T;

  const fallback =
    typeof defaultState === 'function'
      ? (defaultState as () => T | null)()
      : (defaultState ?? null);

  return props ?? fallback;
}
