import { type ReactNode, type HTMLAttributes, useRef, useState, useEffect, Children } from 'react';
import { Box, IconButton, useTheme } from '@mui/material';
import { useMaxHeight, useDisplayMode } from '../../hooks';
import type { GenAIProps } from '../GenAI';

const ChevronLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M15 18L9 12L15 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M9 18L15 12L9 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface CarouselProps extends Omit<GenAIProps, 'children'>, HTMLAttributes<HTMLDivElement> {
  /**
   * Carousel items (typically Card components)
   */
  children: ReactNode;
  /**
   * Gap between items in pixels
   * @default 16
   */
  gap?: number;
  /**
   * Show navigation arrows
   * @default true
   */
  showArrows?: boolean;
  /**
   * Show edge gradients to indicate more content
   * @default true
   */
  showEdgeGradients?: boolean;
  /**
   * Card width configuration. Can be a single number or an object specifying inline and fullscreen widths.
   * @default { inline: 220, fullscreen: 340 }
   */
  cardWidth?: number | { inline?: number; fullscreen?: number };
}

/**
 * Carousel - MUI-based carousel for displaying cards side-by-side.
 * Follows OpenAI ChatGPT Apps SDK design guidelines.
 */
export const Carousel = ({
  children,
  gap = 16,
  maxWidth = 800,
  showArrows = true,
  showEdgeGradients = true,
  cardWidth: cardWidthProp,
  className,
  ...props
}: CarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const maxHeight = useMaxHeight();
  const displayMode = useDisplayMode();
  const theme = useTheme();

  const isFullscreen = displayMode === 'fullscreen';

  // Calculate card width based on display mode and configuration
  const getCardWidth = (): number => {
    if (typeof cardWidthProp === 'number') {
      return cardWidthProp;
    }
    if (typeof cardWidthProp === 'object') {
      return isFullscreen
        ? (cardWidthProp.fullscreen ?? 340)
        : (cardWidthProp.inline ?? 220);
    }
    // Default widths
    return isFullscreen ? 340 : 220;
  };

  const cardWidth = getCardWidth();

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;

    // Get the first card element to calculate card width
    const firstCard = el.children[0] as HTMLElement;
    if (!firstCard) return;

    // Card width + gap = scroll amount for one complete card
    const cardWidth = firstCard.offsetWidth;
    const scrollAmount = cardWidth + gap;

    const targetScroll =
      direction === 'left' ? el.scrollLeft - scrollAmount : el.scrollLeft + scrollAmount;

    el.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;

    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeft(el.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;

    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 2; // Multiply for faster scrolling
    el.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  return (
    <Box
      className={className}
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: `${maxWidth}px`,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}
      {...props}
    >
      <Box sx={{ overflow: 'hidden' }}>
        <Box
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          sx={{
            display: 'flex',
            gap: `${gap}px`,
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollBehavior: isDragging ? 'auto' : 'smooth',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            userSelect: 'none',
            cursor: isDragging ? 'grabbing' : 'grab',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
          }}
        >
          {Children.map(children, (child) => (
            <Box
              sx={{
                flexShrink: 0,
                width: `${cardWidth}px`,
                '& > *': {
                  width: '100%',
                  maxWidth: '100%',
                },
              }}
            >
              {child}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Edge gradients */}
      {showEdgeGradients && canScrollLeft && (
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: '80px',
            pointerEvents: 'none',
            background: `linear-gradient(to right, ${theme.palette.background.default} 0%, transparent 100%)`,
            opacity: canScrollLeft ? 1 : 0,
            transition: 'opacity 0.2s ease',
            zIndex: 1,
          }}
        />
      )}

      {showEdgeGradients && canScrollRight && (
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: '80px',
            pointerEvents: 'none',
            background: `linear-gradient(to left, ${theme.palette.background.default} 0%, transparent 100%)`,
            opacity: canScrollRight ? 1 : 0,
            transition: 'opacity 0.2s ease',
            zIndex: 1,
          }}
        />
      )}

      {/* Navigation buttons */}
      {showArrows && canScrollLeft && (
        <IconButton
          aria-label="Previous"
          onClick={() => scroll('left')}
          sx={{
            position: 'absolute',
            top: '50%',
            left: theme.spacing(0.5),
            transform: 'translateY(-50%)',
            width: 32,
            height: 32,
            backgroundColor: theme.palette.background.default,
            boxShadow: theme.shadows[2],
            zIndex: 2,
            '&:hover': {
              boxShadow: theme.shadows[3],
              transform: 'translateY(-50%) scale(1.05)',
            },
            '&:active': {
              transform: 'translateY(-50%) scale(0.95)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
      )}

      {showArrows && canScrollRight && (
        <IconButton
          aria-label="Next"
          onClick={() => scroll('right')}
          sx={{
            position: 'absolute',
            top: '50%',
            right: theme.spacing(0.5),
            transform: 'translateY(-50%)',
            width: 32,
            height: 32,
            backgroundColor: theme.palette.background.default,
            boxShadow: theme.shadows[2],
            zIndex: 2,
            '&:hover': {
              boxShadow: theme.shadows[3],
              transform: 'translateY(-50%) scale(1.05)',
            },
            '&:active': {
              transform: 'translateY(-50%) scale(0.95)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      )}
    </Box>
  );
};
