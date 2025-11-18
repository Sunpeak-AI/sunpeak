import { type ReactNode, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Button, type ButtonProps } from '../Button';
import { useRequestDisplayMode, useDisplayMode, useMaxHeight, useColorScheme, useWidgetState } from '../../hooks';
import type { GenAIProps } from '../GenAI';

export interface CardProps extends Omit<GenAIProps, 'children'>, HTMLAttributes<HTMLDivElement> {
  /**
   * Card content
   */
  children?: ReactNode;
  /**
   * Image to display at the top of the card
   */
  image: string;
  /**
   * Alt text for the image
   */
  imageAlt: string;
  /**
   * Maximum width for the image in pixels
   */
  imageMaxWidth: number;
  /**
   * Maximum height for the image in pixels
   */
  imageMaxHeight: number;
  /**
   * Optional header text (title)
   */
  header?: ReactNode;
  /**
   * Optional metadata text (e.g., rating, category)
   */
  metadata?: ReactNode;
  /**
   * First action button (0-1)
   */
  button1?: ButtonProps;
  /**
   * Second action button (0-1)
   */
  button2?: ButtonProps;
  /**
   * Card variant
   */
  variant?: 'default' | 'bordered' | 'elevated';
}

/**
 * Card - A responsive card component that adapts to display mode.
 *
 * In inline mode:
 * - Fixed width for carousel consistency
 * - Compact layout optimized for horizontal scrolling
 * - Clickable to request fullscreen mode
 *
 * In fullscreen mode:
 * - Full width layout
 * - Expanded content display
 * - More breathing room for content
 *
 * Design specs:
 * - Image: aspect-square with 24px border radius
 * - Typography: 16px medium for header, 12px for metadata, 14px for description
 * - Spacing: 12px between sections
 * - Max 2 actions in footer (design guideline)
 */
export const Card = ({
  children,
  image,
  imageAlt,
  imageMaxWidth,
  imageMaxHeight,
  header,
  metadata,
  button1,
  button2,
  variant = 'default',
  maxWidth = 800,
  className,
  onClick,
  id,
  ...props
}: CardProps) => {
  const requestDisplayMode = useRequestDisplayMode();
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const colorScheme = useColorScheme();
  const [widgetState, setWidgetState] = useWidgetState<{ selectedCardId?: string }>({});

  // Default to inline mode if display mode is not detected
  const isInline = displayMode !== 'fullscreen' && displayMode !== 'pip';

  const cardClasses = clsx(
    'sp-genai-app',
    'sp-card',
    'sp-select-none',
    'sp-antialiased',
    {
      'sp-card-inline': isInline,
      'sp-card-fullscreen': !isInline,
      'sp-card-elevated': variant === 'elevated',
      'sp-card-bordered': variant === 'bordered',
    },
    colorScheme && `sp-theme-${colorScheme}`,
    className
  );

  const contentClasses = clsx(
    'sp-card-content',
    {
      'sp-card-content-inline': isInline,
      'sp-card-content-fullscreen': !isInline,
      'sp-card-content-inline-with-image': isInline && image,
      'sp-card-content-fullscreen-with-image': !isInline && image,
    }
  );

  const innerClasses = clsx(
    'sp-card-inner',
    {
      'sp-card-inner-inline': isInline,
      'sp-card-inner-fullscreen': !isInline,
    }
  );

  const descriptionClasses = clsx(
    'sp-card-description',
    {
      'sp-card-description-inline': isInline && (metadata || header),
      'sp-card-description-fullscreen': !isInline && (metadata || header),
    }
  );

  const hasButtons = button1 || button2;

  const handleCardClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    // Call custom onClick if provided
    onClick?.(e);

    // Only request fullscreen if we're in inline mode
    if (isInline && !e.defaultPrevented) {
      try {
        // Store the selected card ID in widget state
        if (id) {
          setWidgetState({ ...widgetState, selectedCardId: id });
        }
        await requestDisplayMode({ mode: 'fullscreen' });
      } catch (error) {
        console.error('Failed to request fullscreen mode:', error);
      }
    }
  };

  return (
    <div
      id={id}
      className={cardClasses}
      style={{
        maxWidth: !isInline ? `${maxWidth}px` : undefined,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}
      onClick={handleCardClick}
      {...props}
    >
      {image && (
        <div>
          <img
            src={image}
            alt={imageAlt}
            className="sp-card-image"
            loading="lazy"
            style={{
              maxWidth: `${imageMaxWidth}px`,
              maxHeight: `${imageMaxHeight}px`,
            }}
          />
        </div>
      )}
      <div className={contentClasses}>
        <div className={innerClasses}>
          {header && <div className="sp-card-header sp-truncate">{header}</div>}
          {metadata && <div className="sp-card-metadata">{metadata}</div>}
          {children && (
            <div className={descriptionClasses}>
              {children}
            </div>
          )}
        </div>
        {hasButtons && (
          <div className="sp-card-actions">
            {button1 && <Button {...button1} />}
            {button2 && <Button {...button2} />}
          </div>
        )}
      </div>
    </div>
  );
};
