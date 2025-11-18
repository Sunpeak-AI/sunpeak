import { type ReactNode, type HTMLAttributes, useRef, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useMaxHeight, useColorScheme } from '../../hooks';
import type { GenAIProps } from '../GenAI';

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
}

/**
 * Carousel - A carousel component for displaying multiple cards side-by-side.
 * Follows OpenAI ChatGPT Apps SDK design guidelines.
 *
 * Design specs:
 * - 3-8 items recommended (design guideline)
 * - 16px gap between items
 * - 32px circular navigation buttons with shadow
 * - Edge gradients with fade effect
 * - Padding: 20px vertical
 * - Draggable with mouse for smooth scrolling
 */
export const Carousel = ({
  children,
  gap = 16,
  maxWidth = 800,
  showArrows = true,
  showEdgeGradients = true,
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
  const colorScheme = useColorScheme();

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

  const containerClasses = clsx(
    'sp-genai-app',
    'sp-carousel',
    'sp-antialiased',
    colorScheme && `sp-theme-${colorScheme}`,
    className
  );

  const scrollClasses = clsx(
    'sp-carousel-scroll',
    {
      'sp-carousel-scroll-dragging': isDragging,
    }
  );

  return (
    <div
      className={containerClasses}
      style={{
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
        maxWidth: `${maxWidth}px`
      }}
      {...props}
    >
      <div className="overflow-hidden">
        <div
          ref={scrollRef}
          className={scrollClasses}
          style={{ gap: gap !== 16 ? `${gap}px` : undefined }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
        >
          {children}
        </div>
      </div>

      {/* Edge gradients */}
      {showEdgeGradients && canScrollLeft && (
        <div
          className="sp-carousel-edge sp-carousel-edge-left"
          aria-hidden="true"
          style={{ opacity: canScrollLeft ? 1 : 0 }}
        />
      )}

      {showEdgeGradients && canScrollRight && (
        <div
          className="sp-carousel-edge sp-carousel-edge-right"
          aria-hidden="true"
          style={{ opacity: canScrollRight ? 1 : 0 }}
        />
      )}

      {/* Navigation buttons */}
      {showArrows && canScrollLeft && (
        <button
          aria-label="Previous"
          className="sp-carousel-nav-button sp-carousel-nav-button-prev"
          onClick={() => scroll('left')}
          type="button"
        >
          <svg
            className="sp-carousel-nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {showArrows && canScrollRight && (
        <button
          aria-label="Next"
          className="sp-carousel-nav-button sp-carousel-nav-button-next"
          onClick={() => scroll('right')}
          type="button"
        >
          <svg
            className="sp-carousel-nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 18L15 12L9 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
};
