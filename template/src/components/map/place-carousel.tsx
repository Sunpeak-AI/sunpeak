import * as React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '../../lib/index';
import { PlaceCard } from './place-card';
import type { Place } from '../../simulations/map-simulation';

export type PlaceCarouselProps = {
  places: Place[];
  selectedId: string | null;
  onSelect: (place: Place) => void;
  className?: string;
};

export const PlaceCarousel = React.forwardRef<HTMLDivElement, PlaceCarouselProps>(
  ({ places, selectedId, onSelect, className }, ref) => {
    const [emblaRef] = useEmblaCarousel({ dragFree: true, loop: false });

    return (
      <div
        ref={ref}
        className={cn('absolute inset-x-0 bottom-0 z-20 pointer-events-auto', className)}
      >
        <div className="pt-2">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="px-3 py-3 flex gap-3">
              {places.map((place) => (
                <div
                  key={place.id}
                  className="ring ring-black/10 dark:ring-white/10 max-w-[330px] w-full shadow-xl rounded-2xl bg-surface flex-shrink-0"
                >
                  <PlaceCard
                    place={place}
                    isSelected={selectedId === place.id}
                    onClick={() => onSelect(place)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
PlaceCarousel.displayName = 'PlaceCarousel';
