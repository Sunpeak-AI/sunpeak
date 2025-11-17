import { usePlatformGlobal } from './usePlatformGlobal';
import { type DisplayMode } from '../types';

/**
 * Hook to get the current display mode from the active genAI platform.
 * Display modes include: 'inline', 'fullscreen', and 'pip' (picture-in-picture).
 *
 * Works with any supported genAI platform (ChatGPT, Gemini, Claude, etc.)
 *
 * @returns The current display mode, or null if not in a supported environment
 */
export const useDisplayMode = (): DisplayMode | null => {
  return usePlatformGlobal('displayMode');
};
