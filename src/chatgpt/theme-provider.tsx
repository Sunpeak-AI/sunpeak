import * as React from 'react';
import { applyDocumentTheme } from '@openai/apps-sdk-ui/theme';

type Theme = 'light' | 'dark';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  theme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
};

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  theme: controlledTheme,
  ...props
}: ThemeProviderProps) {
  const [internalTheme] = React.useState<Theme>(defaultTheme);

  const theme = controlledTheme ?? internalTheme;

  // Apply theme synchronously before paint to avoid FOUC
  React.useLayoutEffect(() => {
    // Only apply if we're in a browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        applyDocumentTheme(theme);
      } catch (error) {
        console.warn('Failed to apply document theme:', error);
      }
    }
  }, [theme]);

  const value = {
    theme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useThemeContext = () => {
  const context = React.useContext(ThemeProviderContext);

  if (context === undefined) throw new Error('useThemeContext must be used within a ThemeProvider');

  return context;
};
