import { useSyncExternalStore } from 'react';
import type { PlatformGlobals } from '../types/platform';
import { usePlatform } from '../context/PlatformContext';

/**
 * Hook to access platform global state in a platform-agnostic way.
 * Works with any genAI platform (ChatGPT, Gemini, Claude, etc.)
 *
 * Uses React's useSyncExternalStore to efficiently subscribe to changes.
 *
 * @param key - The key of the global state to access
 * @returns The value of the global state, or null if not available
 *
 * @example
 * ```tsx
 * function MyWidget() {
 *   const colorScheme = usePlatformGlobal('colorScheme');
 *   const displayMode = usePlatformGlobal('displayMode');
 *
 *   return <div className={colorScheme === 'dark' ? 'dark' : 'light'}>...</div>;
 * }
 * ```
 */
export function usePlatformGlobal<K extends keyof PlatformGlobals>(
  key: K
): PlatformGlobals[K] | null {
  const platform = usePlatform();

  return useSyncExternalStore(
    (onChange) => {
      if (!platform) {
        return () => {};
      }

      return platform.subscribe(onChange);
    },
    () => platform?.getGlobal(key) ?? null,
    () => platform?.getGlobal(key) ?? null
  );
}
