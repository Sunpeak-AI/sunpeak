import * as React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { ArrowLeft, ArrowRight } from '@openai/apps-sdk-ui/components/Icon';
import { useWidgetState, useDisplayMode } from 'sunpeak';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { cn } from '../../lib/index';

export interface CarouselState extends Record<string, unknown> {
  currentIndex?: number;
}

export type CarouselProps = {
  children?: React.ReactNode;
  gap?: number;
  showArrows?: boolean;
  showEdgeGradients?: boolean;
  cardWidth?: number | { inline?: number; fullscreen?: number };
  className?: string;
};

export const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  (
    { children, gap = 16, showArrows = true, showEdgeGradients = true, cardWidth, className },
    ref
  ) => {
    const [widgetState, setWidgetState] = useWidgetState<CarouselState>(() => ({
      currentIndex: 0,
    }));
    const displayMode = useDisplayMode();

    const [emblaRef, emblaApi] = useEmblaCarousel(
      {
        align: 'start',
        dragFree: true,
        containScroll: 'trimSnaps',
      },
      [WheelGesturesPlugin()]
    );

    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);

    const scrollPrev = React.useCallback(() => {
      if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = React.useCallback(() => {
      if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    const onSelect = React.useCallback(() => {
      if (!emblaApi) return;

      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());

      const currentIndex = emblaApi.selectedScrollSnap();
      if (widgetState?.currentIndex !== currentIndex) {
        setWidgetState({ currentIndex });
      }
    }, [emblaApi, widgetState?.currentIndex, setWidgetState]);

    React.useEffect(() => {
      if (!emblaApi) return;

      onSelect();
      emblaApi.on('select', onSelect);
      emblaApi.on('reInit', onSelect);

      return () => {
        emblaApi.off('select', onSelect);
        emblaApi.off('reInit', onSelect);
      };
    }, [emblaApi, onSelect]);

    const childArray = React.Children.toArray(children);

    const getCardWidth = () => {
      if (typeof cardWidth === 'number') {
        return cardWidth;
      }
      if (cardWidth && typeof cardWidth === 'object') {
        if (displayMode === 'fullscreen' && cardWidth.fullscreen) {
          return cardWidth.fullscreen;
        }
        if (cardWidth.inline) {
          return cardWidth.inline;
        }
      }
      return 220;
    };

    const cardWidthPx = getCardWidth();

    return (
      <div ref={ref} className={cn('relative w-full', className)}>
        {/* Left edge gradient */}
        {showEdgeGradients && canScrollPrev && (
          <div
            className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-surface to-transparent"
            aria-hidden="true"
          />
        )}

        {/* Right edge gradient */}
        {showEdgeGradients && canScrollNext && (
          <div
            className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-surface to-transparent"
            aria-hidden="true"
          />
        )}

        {/* Carousel viewport */}
        <div ref={emblaRef} className="overflow-hidden w-full">
          <div
            className="flex touch-pan-y"
            style={{
              gap: `${gap}px`,
              marginLeft: `-${gap}px`,
              paddingLeft: `${gap}px`,
            }}
          >
            {childArray.map((child, index) => (
              <div
                key={index}
                className="flex-none"
                style={{
                  minWidth: `${cardWidthPx}px`,
                  maxWidth: `${cardWidthPx}px`,
                }}
              >
                {child}
              </div>
            ))}
          </div>
        </div>

        {/* Previous button */}
        {showArrows && canScrollPrev && (
          <Button
            variant="soft"
            color="secondary"
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 min-w-8 rounded-full p-0 shadow-md"
            aria-label="Previous slide"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Next button */}
        {showArrows && canScrollNext && (
          <Button
            variant="soft"
            color="secondary"
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 min-w-8 rounded-full p-0 shadow-md"
            aria-label="Next slide"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }
);
Carousel.displayName = 'Carousel';
