import { type ReactNode, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { useMaxHeight, useColorScheme } from '../../hooks';

export interface GenAIProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Maximum width in pixels
   * @default 800
   */
  maxWidth?: number;
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
 * @example
 * ```tsx
 * export const MyApp = GenAI(() => (
 *   <div>My content</div>
 * ));
 * ```
 */
export function GenAI(
  renderFn: (props: GenAIRenderProps) => ReactNode
) {
  const GenAIComponent = (props: GenAIProps = {}) => {
    const maxHeight = useMaxHeight();
    const colorScheme = useColorScheme();
    const { className, maxWidth = 800, ...rest } = props;

    const containerClasses = clsx(
      'sp-genai-app',
      'sp-antialiased',
      colorScheme && `sp-theme-${colorScheme}`,
      className
    );

    return (
      <div
        className={containerClasses}
        style={{
          maxWidth: `${maxWidth}px`,
          maxHeight: maxHeight ? `${maxHeight}px` : undefined,
        }}
        {...rest}
      >
        {renderFn({ maxHeight, colorScheme })}
      </div>
    );
  };

  GenAIComponent.displayName = 'GenAI';
  return GenAIComponent;
}
