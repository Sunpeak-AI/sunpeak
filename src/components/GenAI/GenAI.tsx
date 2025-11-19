import { type ReactNode, type HTMLAttributes } from 'react';
import { Box } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useMaxHeight, useColorScheme } from '../../hooks';
import { getTheme } from '../../themes';

export interface GenAIProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Maximum width in pixels
   * @default 800
   */
  maxWidth?: number;

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

export interface GenAIRenderProps {
  /**
   * Maximum height from platform (in pixels)
   */
  maxHeight: number | null;
  /**
   * Color scheme from platform
   */
  colorScheme: 'light' | 'dark' | null;
}

/**
 * GenAI - Create platform-aware genAI Apps with automatic theming and constraints.
 *
 * This is the single interface for building genAI Apps. It automatically provides:
 * - MUI theming (light/dark mode from platform)
 * - Platform constraints (maxHeight)
 * - Color scheme information
 *
 * @example
 * ```tsx
 * export const MyApp = GenAI(({ maxHeight, colorScheme }) => (
 *   <div>
 *     <h2>My App</h2>
 *     <p>Theme: {colorScheme}</p>
 *     <p>Max height: {maxHeight}px</p>
 *   </div>
 * ));
 * ```
 */
export function GenAI(
  renderFn: (props: GenAIRenderProps) => ReactNode
) {
  const GenAIComponent = (props: GenAIProps = {}) => {
    const maxHeight = useMaxHeight();
    const detectedColorScheme = useColorScheme();
    const {
      className,
      maxWidth = 800,
      mode: overrideMode,
      enableCssBaseline = true,
      ...rest
    } = props;

    // Determine effective color scheme
    const colorScheme = overrideMode || detectedColorScheme || 'light';

    const theme = getTheme(colorScheme);

    return (
      <ThemeProvider theme={theme}>
        {enableCssBaseline && <CssBaseline />}
        <Box
          className={className}
          sx={{
            maxWidth: `${maxWidth}px`,
            maxHeight: maxHeight ? `${maxHeight}px` : undefined,
          }}
          {...rest}
        >
          {renderFn({ maxHeight, colorScheme })}
        </Box>
      </ThemeProvider>
    );
  };

  GenAIComponent.displayName = 'GenAI';
  return GenAIComponent;
}
