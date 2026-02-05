import * as React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { ArrowLeft, ArrowRight } from '@openai/apps-sdk-ui/components/Icon';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { cn } from '../../../lib/index';

export type CarouselProps = {
  children?: React.ReactNode;
  gap?: number;
  showArrows?: boolean;
  showEdgeGradients?: boolean;
  cardWidth?: number | { inline?: number; fullscreen?: number };
  displayMode?: string;
  className?: string;
};

export function Carousel({
  children,
  gap = 16,
  showArrows = true,
  showEdgeGradients = true,
  cardWidth,
  displayMode = 'inline',
  className,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

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

  // Track the last index we synced to avoid redundant updates
  const lastSyncedIndexRef = React.useRef<number | null>(null);

  const onSelect = React.useCallback(() => {
    if (!emblaApi) return;

    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());

    const idx = emblaApi.selectedScrollSnap();

    if (lastSyncedIndexRef.current !== idx) {
      lastSyncedIndexRef.current = idx;
      setCurrentIndex(idx);
    }
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;

    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    lastSyncedIndexRef.current = emblaApi.selectedScrollSnap();

    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Sync external index changes to carousel scroll position
  React.useEffect(() => {
    if (!emblaApi) return;

    const current = emblaApi.selectedScrollSnap();

    if (currentIndex !== current && lastSyncedIndexRef.current !== currentIndex) {
      lastSyncedIndexRef.current = currentIndex;
      emblaApi.scrollTo(currentIndex);
    }
  }, [emblaApi, currentIndex]);

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
    <div className={cn('relative w-full', className)}>
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
