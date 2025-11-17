import { usePlatformGlobal } from './usePlatformGlobal';

/**
 * Hook to get the maximum height constraint from the active genAI platform.
 * Useful for ensuring your widget doesn't exceed the available space.
 *
 * Works with any supported genAI platform (ChatGPT, Gemini, Claude, etc.)
 *
 * @returns The maximum height in pixels, or null if not available
 */
export const useMaxHeight = (): number | null => {
  return usePlatformGlobal('maxHeight');
};
