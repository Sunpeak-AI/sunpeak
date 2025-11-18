/**
 * Sunpeak Theme Provider
 *
 * A wrapper around MUI's ThemeProvider that automatically applies the correct theme
 * based on the platform and color scheme from window.openai.colorScheme.
 *
 * This component integrates with the existing Sunpeak hooks (useColorScheme)
 * to provide seamless theme switching.
 */

import { type ReactNode, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useColorScheme } from '../../hooks';
import { getTheme } from '../../themes';

export interface ThemeProviderProps {
  /**
   * Children to render within the theme context
   */
  children: ReactNode;

  /**
   * Override the color scheme detection
   * If not provided, uses window.openai.colorScheme
   */
  mode?: 'light' | 'dark';

  /**
   * Whether to inject MUI's CssBaseline component
   * @default true
   */
  enableCssBaseline?: boolean;
}

/**
 * Sunpeak Theme Provider Component
 *
 * Provides MUI theme context to all child components, automatically
 * switching between light and dark themes based on the platform's color scheme.
 *
 * @example
 * ```tsx
 * import { ThemeProvider } from 'sunpeak';
 *
 * function App() {
 *   return (
 *     <ThemeProvider>
 *       <YourComponents />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 *
 * @example With mode override
 * ```tsx
 * <ThemeProvider mode="dark">
 *   <YourComponents />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  children,
  mode: overrideMode,
  enableCssBaseline = true,
}: ThemeProviderProps) {
  // Get color scheme from window.openai if not overridden
  const detectedColorScheme = useColorScheme();
  const mode = overrideMode || detectedColorScheme || 'light';

  // Create theme based on current mode
  // Memoize to avoid recreating theme on every render
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <MuiThemeProvider theme={theme}>
      {enableCssBaseline && <CssBaseline />}
      {children}
    </MuiThemeProvider>
  );
}
