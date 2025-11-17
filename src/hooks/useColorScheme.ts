import { usePlatformGlobal } from './usePlatformGlobal';
import { type Theme } from '../types';

/**
 * Hook to get the current color scheme from the active genAI platform.
 * Color scheme can be 'light' or 'dark'.
 *
 * Works with any supported genAI platform (ChatGPT, Gemini, Claude, etc.)
 *
 * @returns The current color scheme, or null if not in a supported environment
 */
export const useColorScheme = (): Theme | null => {
  return usePlatformGlobal('colorScheme');
};
