import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
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

    return typeof defaultState === 'function' ? defaultState() : (defaultState ?? null);
  });

  // Track whether we've sent the initial state to the API
  const hasSentInitialState = useRef(false);

  // Track local updates to avoid circular sync
  const isLocalUpdate = useRef(false);

  // Pending state to send to API (set during state update, sent via effect)
  const pendingApiState = useRef<T | null>(null);

  // Send initial default state to API when api becomes available and no provider state exists
  useEffect(() => {
    if (
      !hasSentInitialState.current &&
      widgetStateFromProvider == null &&
      widgetState != null &&
      api?.setWidgetState
    ) {
      hasSentInitialState.current = true;
      isLocalUpdate.current = true;
      api.setWidgetState(widgetState);
    }
  }, [api, widgetState, widgetStateFromProvider]);

  // Send pending state to API after render completes (avoids setState during render)
  useEffect(() => {
    if (pendingApiState.current != null && api?.setWidgetState) {
      isLocalUpdate.current = true;
      api.setWidgetState(pendingApiState.current);
      pendingApiState.current = null;
    }
  });

  // Sync local state when provider state changes (external system subscription)
  useEffect(() => {
    // Skip sync if we initiated this change locally
    if (isLocalUpdate.current) {
      isLocalUpdate.current = false;
      return;
    }
    if (widgetStateFromProvider != null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with external provider state
      _setWidgetState(widgetStateFromProvider);
    }
  }, [widgetStateFromProvider]);

  const setWidgetState = useCallback((state: SetStateAction<T | null>) => {
    _setWidgetState((prevState) => {
      const newState = typeof state === 'function' ? state(prevState) : state;

      // Queue the API call to happen after render via useEffect
      // This avoids calling the API during React's state update which can
      // trigger useSyncExternalStore re-renders during render
      if (newState != null) {
        pendingApiState.current = newState;
      }

      return newState;
    });
  }, []);

  return [widgetState, setWidgetState] as const;
}
