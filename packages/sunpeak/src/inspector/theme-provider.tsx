import * as React from 'react';

type Theme = 'light' | 'dark';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  theme?: Theme;
  /** Custom theme applier. If not provided, falls back to setting data-theme attribute. */
  applyTheme?: (theme: Theme) => void;
};

type ThemeProviderState = {
  theme: Theme;
};

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(undefined);

/** Default theme applier: sets data-theme attribute on document.documentElement */
function defaultApplyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  theme: controlledTheme,
  applyTheme,
  ...props
}: ThemeProviderProps) {
  const [internalTheme] = React.useState<Theme>(defaultTheme);

  const theme = controlledTheme ?? internalTheme;
  const applier = applyTheme ?? defaultApplyTheme;

  // Apply theme synchronously before paint to avoid FOUC
  React.useLayoutEffect(() => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        applier(theme);
      } catch (error) {
        console.warn('Failed to apply document theme:', error);
      }
    }
  }, [theme, applier]);

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
