/**
 * Base Theme Configuration
 *
 * Common theme configuration shared across all platforms.
 * Platform-specific themes extend this base configuration.
 */

import { createTheme, type ThemeOptions } from '@mui/material/styles';

/**
 * Base theme options that all platform themes extend
 */
export const baseThemeOptions: ThemeOptions = {
  spacing: 4, // 4px base unit (matches --sp-spacing-1)

  shape: {
    borderRadius: 8, // Default border radius in pixels
  },

  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },

  // Common breakpoints for responsive design
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
};

/**
 * Creates a base theme with common configuration
 */
export const createBaseTheme = () => createTheme(baseThemeOptions);
