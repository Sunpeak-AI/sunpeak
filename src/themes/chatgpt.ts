/**
 * ChatGPT Theme
 *
 * Material UI theme based on OpenAI ChatGPT Apps SDK design guidelines.
 * Implements the design system defined in chatgpt.css.
 *
 * @see https://developers.openai.com/apps-sdk/concepts/design-guidelines
 */

import { createTheme } from '@mui/material/styles';
import { baseThemeOptions } from './base';

/**
 * ChatGPT Light Mode Colors
 * Extracted from chatgpt.css --sp-light-* variables
 */
const lightPalette = {
  mode: 'light' as const,
  primary: {
    main: '#f46c21', // --sp-light-accent
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#5d5d5d', // --sp-light-color-text-secondary
    contrastText: '#ffffff',
  },
  error: {
    main: '#e02e2a', // --sp-light-error
    contrastText: '#ffffff',
  },
  warning: {
    main: '#e25507', // --sp-light-warning
    contrastText: '#ffffff',
  },
  info: {
    main: '#0285ff', // --sp-light-info
    contrastText: '#ffffff',
  },
  success: {
    main: '#008635', // --sp-light-success
    contrastText: '#ffffff',
  },
  background: {
    default: '#ffffff', // --sp-light-color-bg-primary
    paper: '#f3f3f3', // --sp-light-color-bg-tertiary
  },
  text: {
    primary: '#0d0d0d', // --sp-light-color-text-primary
    secondary: '#5d5d5d', // --sp-light-color-text-secondary
    disabled: '#8f8f8f', // --sp-light-color-text-tertiary
  },
  divider: 'rgba(0, 0, 0, 0.15)', // --sp-light-color-border
  action: {
    hover: 'rgba(0, 0, 0, 0.04)',
    selected: 'rgba(0, 0, 0, 0.08)',
    disabled: '#8f8f8f',
    disabledBackground: 'rgba(0, 0, 0, 0.12)',
  },
};

/**
 * ChatGPT Dark Mode Colors
 * Extracted from chatgpt.css --sp-dark-* variables
 */
const darkPalette = {
  mode: 'dark' as const,
  primary: {
    main: '#f46c21', // --sp-dark-accent
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#cdcdcd', // --sp-dark-color-text-secondary
    contrastText: '#212121',
  },
  error: {
    main: '#ff8583', // --sp-dark-error
    contrastText: '#212121',
  },
  warning: {
    main: '#ff9e6c', // --sp-dark-warning
    contrastText: '#212121',
  },
  info: {
    main: '#0285ff', // --sp-dark-info
    contrastText: '#ffffff',
  },
  success: {
    main: '#40c977', // --sp-dark-success
    contrastText: '#212121',
  },
  background: {
    default: '#212121', // --sp-dark-color-bg-primary
    paper: '#414141', // --sp-dark-color-bg-tertiary
  },
  text: {
    primary: '#ffffff', // --sp-dark-color-text-primary
    secondary: '#cdcdcd', // --sp-dark-color-text-secondary
    disabled: '#afafaf', // --sp-dark-color-text-tertiary
  },
  divider: 'rgba(0, 0, 0, 0.15)', // --sp-dark-color-border
  action: {
    hover: 'rgba(255, 255, 255, 0.08)',
    selected: 'rgba(255, 255, 255, 0.16)',
    disabled: '#afafaf',
    disabledBackground: 'rgba(255, 255, 255, 0.12)',
  },
};

/**
 * ChatGPT Typography System
 * Based on --sp-font-* variables from chatgpt.css
 */
const typography = {
  fontFamily: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  fontSize: 16, // Base font size (--sp-font-size-base)
  fontWeightLight: 300,
  fontWeightRegular: 400, // --sp-font-weight-normal
  fontWeightMedium: 500, // --sp-font-weight-medium
  fontWeightBold: 600, // --sp-font-weight-semibold
  h1: {
    fontSize: '1.25rem', // 20px - --sp-font-size-xl
    fontWeight: 600,
    lineHeight: 1.25, // --sp-line-height-tight
  },
  h2: {
    fontSize: '1.125rem', // 18px - --sp-font-size-lg
    fontWeight: 600,
    lineHeight: 1.25,
  },
  h3: {
    fontSize: '1rem', // 16px - --sp-font-size-base
    fontWeight: 600,
    lineHeight: 1.25,
  },
  h4: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.25,
  },
  h5: {
    fontSize: '0.875rem', // 14px - --sp-font-size-sm
    fontWeight: 600,
    lineHeight: 1.25,
  },
  h6: {
    fontSize: '0.75rem', // 12px - --sp-font-size-xs
    fontWeight: 600,
    lineHeight: 1.25,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.5, // --sp-line-height-normal
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.25,
    textTransform: 'none' as const, // Don't uppercase buttons
  },
  caption: {
    fontSize: '0.75rem',
    lineHeight: 1.5,
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: 1.5,
    textTransform: 'uppercase' as const,
  },
};

/**
 * ChatGPT Spacing System
 * Based on 4px grid (--sp-spacing-*)
 */
const spacing = 4; // 1 unit = 4px

/**
 * ChatGPT Shape/Border Radius
 * Based on --sp-radius-* variables
 */
const shape = {
  borderRadius: 8, // --sp-radius-md (default)
};

/**
 * ChatGPT Shadows
 * Based on --sp-shadow-* variables
 */
const shadows: [
  'none',
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
] = [
  'none',
  '0px 1px 2px rgba(0, 0, 0, 0.05)', // --sp-shadow-sm
  '0px 2px 6px rgba(0, 0, 0, 0.06)', // --sp-shadow-md
  '0px 4px 12px rgba(0, 0, 0, 0.1)', // --sp-shadow-lg
  '0px 8px 24px rgba(0, 0, 0, 0.12)', // --sp-shadow-xl
  // Repeat last shadow for MUI's 24 shadow levels
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
];

/**
 * Component-specific overrides following ChatGPT design guidelines
 */
const components = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '0.5rem', // --sp-radius-md
        padding: '0.375rem 1rem', // --sp-button-padding-y --sp-button-padding-x
        fontSize: '0.875rem',
        fontWeight: 500,
        textTransform: 'none' as const,
        transition: 'all 0.2s ease',
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: '0.75rem', // --sp-radius-lg
        overflow: 'hidden',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      rounded: {
        borderRadius: '0.75rem', // --sp-radius-lg
      },
    },
  },
};

/**
 * Create ChatGPT Light Theme
 */
export const chatgptLightTheme = createTheme({
  ...baseThemeOptions,
  palette: lightPalette,
  typography,
  spacing,
  shape,
  shadows,
  components,
});

/**
 * Create ChatGPT Dark Theme
 */
export const chatgptDarkTheme = createTheme({
  ...baseThemeOptions,
  palette: darkPalette,
  typography,
  spacing,
  shape,
  shadows,
  components,
});

/**
 * Get ChatGPT theme based on mode
 */
export const getChatGPTTheme = (mode: 'light' | 'dark') => {
  return mode === 'dark' ? chatgptDarkTheme : chatgptLightTheme;
};
