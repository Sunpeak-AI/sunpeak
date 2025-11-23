import { useSyncExternalStore } from 'react';
import {
  getGlobal,
  subscribeToGlobal,
  type WidgetGlobals,
} from '../providers';

/**
 * Hook to read and subscribe to a global property from the widget runtime.
 * Automatically detects and uses the appropriate provider (OpenAI, etc.).
 *
 * @param key - The global property key to read.
 * @returns The current value, or null if not available.
 */
export function useWidgetGlobal<K extends keyof WidgetGlobals>(
  key: K
): WidgetGlobals[K] | null {
  return useSyncExternalStore(
    (onChange) => subscribeToGlobal(key, onChange),
    () => getGlobal(key),
    () => getGlobal(key)
  );
}
