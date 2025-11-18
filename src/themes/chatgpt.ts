/**
 * ChatGPT Theme
 *
 * Material UI theme implementing OpenAI ChatGPT Apps SDK design guidelines.
 *
 * @see https://developers.openai.com/apps-sdk/concepts/design-guidelines
 */

import { createTheme } from '@mui/material/styles';
import { baseThemeOptions } from './base';

/**
 * ChatGPT Light Mode Colors
 */
const lightPalette = {
  mode: 'light' as const,
  primary: {
    main: '#f46c21',
    dark: '#d45e1c',
    light: 'rgba(244, 108, 33, 0.9)',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#5d5d5d',
    contrastText: '#ffffff',
  },
  error: {
    main: '#e02e2a',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#e25507',
    contrastText: '#ffffff',
  },
  info: {
    main: '#0285ff',
    contrastText: '#ffffff',
  },
  success: {
    main: '#008635',
    contrastText: '#ffffff',
  },
  background: {
    default: '#ffffff',
    paper: '#f3f3f3',
  },
  text: {
    primary: '#0d0d0d',
    secondary: '#5d5d5d',
    disabled: '#8f8f8f',
  },
  divider: 'rgba(0, 0, 0, 0.15)',
  action: {
    hover: 'rgba(0, 0, 0, 0.04)',
    selected: 'rgba(0, 0, 0, 0.08)',
    disabled: '#8f8f8f',
    disabledBackground: 'rgba(0, 0, 0, 0.12)',
  },
  grey: {
    50: '#f3f3f3',
    100: '#e8e8e8',
    200: 'rgba(0, 0, 0, 0.05)',
    300: 'rgba(0, 0, 0, 0.15)',
    400: '#8f8f8f',
    500: '#5d5d5d',
    900: '#0d0d0d',
  },
};

/**
 * ChatGPT Dark Mode Colors
 */
const darkPalette = {
  mode: 'dark' as const,
  primary: {
    main: '#f46c21',
    dark: '#d45e1c',
    light: 'rgba(244, 108, 33, 0.9)',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#cdcdcd',
    contrastText: '#212121',
  },
  error: {
    main: '#ff8583',
    contrastText: '#212121',
  },
  warning: {
    main: '#ff9e6c',
    contrastText: '#212121',
  },
  info: {
    main: '#0285ff',
    contrastText: '#ffffff',
  },
  success: {
    main: '#40c977',
    contrastText: '#212121',
  },
  background: {
    default: '#212121',
    paper: '#414141',
  },
  text: {
    primary: '#ffffff',
    secondary: '#cdcdcd',
    disabled: '#afafaf',
  },
  divider: 'rgba(0, 0, 0, 0.15)',
  action: {
    hover: 'rgba(255, 255, 255, 0.08)',
    selected: 'rgba(255, 255, 255, 0.16)',
    disabled: '#afafaf',
    disabledBackground: 'rgba(255, 255, 255, 0.12)',
  },
  grey: {
    50: '#414141',
    100: '#303030',
    200: 'rgba(0, 0, 0, 0.05)',
    300: 'rgba(0, 0, 0, 0.15)',
    400: '#afafaf',
    500: '#cdcdcd',
    900: '#ffffff',
    800: '#212121',
  },
};

/**
 * ChatGPT Typography System
 * System font stack with platform-native fonts
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
  fontSize: 16,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,
  h1: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.25,
  },
  h2: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.25,
  },
  h3: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.25,
  },
  h4: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.25,
  },
  h5: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: 1.25,
  },
  h6: {
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: 1.25,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.25,
    textTransform: 'none' as const,
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
 * 4px base unit (1 unit = 4px)
 */
const spacing = 4;

/**
 * ChatGPT Shape/Border Radius
 */
const shape = {
  borderRadius: 8,
};

/**
 * ChatGPT Shadows
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
  '0px 1px 2px rgba(0, 0, 0, 0.05)',
  '0px 2px 6px rgba(0, 0, 0, 0.06)',
  '0px 4px 12px rgba(0, 0, 0, 0.1)',
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
  '0px 8px 24px rgba(0, 0, 0, 0.12)',
];

/**
 * Component-specific overrides following ChatGPT design guidelines
 */
const components = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '0.5rem',
        padding: '0.375rem 1rem',
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
        borderRadius: '0.75rem',
        overflow: 'hidden',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      rounded: {
        borderRadius: '0.75rem',
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
