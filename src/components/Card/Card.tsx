import { type ReactNode, type HTMLAttributes } from 'react';
import { Button, type ButtonProps as MuiButtonProps, Box, useTheme } from '@mui/material';
import { useRequestDisplayMode, useDisplayMode, useMaxHeight, useWidgetState } from '../../hooks';
import type { GenAIProps } from '../GenAI';

export interface ButtonProps extends Omit<MuiButtonProps, 'onClick'> {
  /**
   * Whether to use primary styling (accent color) or secondary (outlined)
   */
  isPrimary?: boolean;
  /**
   * Click handler (required)
   */
  onClick: () => void;
}

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
  className,
  onClick,
  id,
  ...props
}: CardProps) => {
  const requestDisplayMode = useRequestDisplayMode();
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const theme = useTheme();
  const [widgetState, setWidgetState] = useWidgetState<{ selectedCardId?: string }>({});

  // Default to inline mode if display mode is not detected
  const isInline = displayMode !== 'fullscreen' && displayMode !== 'pip';

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

  const renderButton = (buttonProps: ButtonProps) => {
    const { isPrimary = false, onClick: buttonOnClick, children, ...muiProps } = buttonProps;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      buttonOnClick();
    };

    return (
      <Button
        {...muiProps}
        variant={isPrimary ? 'contained' : 'outlined'}
        onClick={handleClick}
      >
        {children}
      </Button>
    );
  };

  return (
    <Box
      id={id}
      className={className}
      onClick={handleCardClick}
      sx={{
        backgroundColor: theme.palette.background.default,
        borderRadius: theme.spacing(3),
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: theme.typography.fontFamily,
        width: isInline ? '220px' : '100%',
        maxWidth: isInline ? '220px' : `${imageMaxWidth}px`,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
        cursor: isInline ? 'pointer' : 'default',
        userSelect: 'none',
        marginLeft: isInline ? undefined : 'auto',
        marginRight: isInline ? undefined : 'auto',
        ...(variant === 'bordered' && {
          border: `1px solid ${theme.palette.divider}`,
        }),
        ...(variant === 'elevated' && {
          boxShadow: theme.shadows[2],
          border: `1px solid ${theme.palette.divider}`,
        }),
      }}
      {...props}
    >
      {image && (
        <Box>
          <Box
            component="img"
            src={image}
            alt={imageAlt}
            loading="lazy"
            sx={{
              width: '100%',
              height: 'auto',
              aspectRatio: '1',
              objectFit: 'cover',
              borderRadius: theme.spacing(3),
              display: 'block',
              maxWidth: `${imageMaxWidth}px`,
              maxHeight: `${imageMaxHeight}px`,
            }}
          />
        </Box>
      )}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          gap: isInline ? theme.spacing(3) : theme.spacing(4),
          padding: isInline ? theme.spacing(4) : theme.spacing(6),
          ...(image && {
            paddingTop: isInline ? theme.spacing(3) : theme.spacing(4),
          }),
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            gap: isInline ? theme.spacing(1) : theme.spacing(2),
          }}
        >
          {header && (
            <Box
              sx={{
                fontSize: theme.typography.body1.fontSize,
                fontWeight: theme.typography.fontWeightMedium,
                color: theme.palette.text.primary,
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {header}
            </Box>
          )}
          {metadata && (
            <Box
              sx={{
                fontSize: theme.typography.caption.fontSize,
                color: theme.palette.text.secondary,
                lineHeight: 1.5,
              }}
            >
              {metadata}
            </Box>
          )}
          {children && (
            <Box
              sx={{
                fontSize: theme.typography.body2.fontSize,
                color: theme.palette.text.primary,
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                ...(isInline && (metadata || header) && {
                  marginTop: theme.spacing(1),
                  WebkitLineClamp: 2,
                }),
                ...(!isInline && (metadata || header) && {
                  marginTop: theme.spacing(2),
                  WebkitLineClamp: 'unset',
                }),
              }}
            >
              {children}
            </Box>
          )}
        </Box>
        {hasButtons && (
          <Box
            sx={{
              display: 'flex',
              gap: theme.spacing(2),
              flexWrap: 'wrap',
            }}
          >
            {button1 && renderButton(button1)}
            {button2 && renderButton(button2)}
          </Box>
        )}
      </Box>
    </Box>
  );
};
