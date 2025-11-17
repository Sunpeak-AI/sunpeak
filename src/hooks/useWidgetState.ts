import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import { usePlatformGlobal } from './usePlatformGlobal';
import { usePlatform } from '../context/PlatformContext';
import type { UnknownObject } from '../types';

/**
 * Hook to manage widget state that persists in the active genAI platform.
 * Similar to useState, but syncs with the platform host page.
 *
 * Works with any supported genAI platform (ChatGPT, Gemini, Claude, etc.)
 *
 * @param defaultState - Default state value or function to generate it
 * @returns A tuple of [state, setState] similar to useState
 */
export function useWidgetState<T extends UnknownObject>(
  defaultState: T | (() => T)
): readonly [T, (state: SetStateAction<T>) => void];
export function useWidgetState<T extends UnknownObject>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void];
export function useWidgetState<T extends UnknownObject>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void] {
  const widgetStateFromWindow = usePlatformGlobal('widgetState') as T;
  const platform = usePlatform();

  const [widgetState, _setWidgetState] = useState<T | null>(() => {
    if (widgetStateFromWindow != null) {
      return widgetStateFromWindow;
    }

    return typeof defaultState === 'function' ? defaultState() : defaultState ?? null;
  });

  useEffect(() => {
    _setWidgetState(widgetStateFromWindow);
  }, [widgetStateFromWindow]);

  const setWidgetState = useCallback(
    (state: SetStateAction<T | null>) => {
      _setWidgetState((prevState) => {
        const newState = typeof state === 'function' ? state(prevState) : state;

        if (newState != null && platform) {
          const globals = platform.getGlobals();
          if (globals?.setWidgetState) {
            globals.setWidgetState(newState);
          }
        }

        return newState;
      });
    },
    [platform]
  );

  return [widgetState, setWidgetState] as const;
}
