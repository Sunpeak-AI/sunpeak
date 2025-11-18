/**
 * Theme System - Multi-Platform Support
 *
 * This module provides build-time theme substitution for multi-platform support.
 * The active theme is determined by the SUNPEAK_PLATFORM environment variable.
 *
 * Supported platforms:
 * - chatgpt (default): OpenAI ChatGPT Apps SDK
 * - Add more platforms as needed
 *
 * Usage:
 * ```bash
 * # Build for ChatGPT platform (default)
 * SUNPEAK_PLATFORM=chatgpt npm run build
 *
 * # Build for another platform (future)
 * SUNPEAK_PLATFORM=gemini npm run build
 * ```
 */

import type { Theme } from '@mui/material/styles';

// Platform theme imports
import { getChatGPTTheme, chatgptLightTheme, chatgptDarkTheme } from './chatgpt';

/**
 * Platform identifier type
 */
export type Platform = 'chatgpt';

/**
 * Get the current platform
 * Currently only supports 'chatgpt'
 * Future: Can be extended to support multiple platforms via build-time configuration
 */
export const getCurrentPlatform = (): Platform => {
  return 'chatgpt';
};

/**
 * Theme getter function type
 */
export type ThemeGetter = (mode: 'light' | 'dark') => Theme;

/**
 * Platform theme registry
 * Maps platform names to their theme getter functions
 */
const platformThemes: Record<Platform, ThemeGetter> = {
  chatgpt: getChatGPTTheme,
  // Add more platforms here:
  // gemini: getGeminiTheme,
  // claude: getClaudeTheme,
};

/**
 * Get theme for current platform
 * This is the main function used by components
 *
 * @param mode - Light or dark mode
 * @returns MUI Theme object for the current platform
 */
export const getTheme = (mode: 'light' | 'dark'): Theme => {
  const platform = getCurrentPlatform();
  const themeGetter = platformThemes[platform];

  if (!themeGetter) {
    console.warn(`Unknown platform "${platform}", falling back to chatgpt theme`);
    return getChatGPTTheme(mode);
  }

  return themeGetter(mode);
};

/**
 * Get light theme for current platform
 */
export const getLightTheme = (): Theme => getTheme('light');

/**
 * Get dark theme for current platform
 */
export const getDarkTheme = (): Theme => getTheme('dark');

// Export specific platform themes for direct access if needed
export { chatgptLightTheme, chatgptDarkTheme, getChatGPTTheme };

// Export base theme utilities
export { baseThemeOptions, createBaseTheme } from './base';

// Export types
export type { Theme } from '@mui/material/styles';
