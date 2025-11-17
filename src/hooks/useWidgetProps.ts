import { usePlatformGlobal } from './usePlatformGlobal';

/**
 * Hook to get widget props (tool output) from the active genAI platform.
 * This contains the data returned by your server's tool.
 *
 * Works with any supported genAI platform (ChatGPT, Gemini, Claude, etc.)
 *
 * @param defaultState - Default state to use if no props are available
 * @returns The widget props from the tool output
 */
export function useWidgetProps<T extends Record<string, unknown>>(
  defaultState?: T | (() => T)
): T {
  const props = usePlatformGlobal('toolOutput') as T;

  const fallback =
    typeof defaultState === 'function'
      ? (defaultState as () => T | null)()
      : defaultState ?? null;

  return props ?? fallback;
}
