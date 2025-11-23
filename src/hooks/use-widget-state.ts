import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import { useWidgetGlobal } from './use-widget-global';
import { useWidgetAPI } from './use-widget-api';
import type { UnknownObject } from '../types';

export function useWidgetState<T extends UnknownObject>(
  defaultState: T | (() => T)
): readonly [T, (state: SetStateAction<T>) => void];
export function useWidgetState<T extends UnknownObject>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void];
export function useWidgetState<T extends UnknownObject>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void] {
  const widgetStateFromProvider = useWidgetGlobal('widgetState') as T;
  const api = useWidgetAPI();

  const [widgetState, _setWidgetState] = useState<T | null>(() => {
    if (widgetStateFromProvider != null) {
      return widgetStateFromProvider;
    }

    return typeof defaultState === 'function'
      ? defaultState()
      : defaultState ?? null;
  });

  useEffect(() => {
    _setWidgetState(widgetStateFromProvider);
  }, [widgetStateFromProvider]);

  const setWidgetState = useCallback(
    (state: SetStateAction<T | null>) => {
      _setWidgetState((prevState) => {
        const newState = typeof state === 'function' ? state(prevState) : state;

        if (newState != null && api?.setWidgetState) {
          api.setWidgetState(newState);
        }

        return newState;
      });
    },
    [api]
  );

  return [widgetState, setWidgetState] as const;
}
