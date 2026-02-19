import * as React from 'react';
import { Settings } from '../../../components/icon';
import { cn } from '../../../lib/index';
import { PlaceCard } from './place-card';
import type { Place } from './types';

export type PlaceListProps = {
  places: Place[];
  selectedId: string | null;
  onSelect: (place: Place) => void;
  className?: string;
};

export const PlaceList = React.forwardRef<HTMLDivElement, PlaceListProps>(
  ({ places, selectedId, onSelect, className }, ref) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [showBottomFade, setShowBottomFade] = React.useState(false);

    const updateBottomFadeVisibility = React.useCallback(() => {
      const el = scrollRef.current;
      if (!el) return;
      const atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;
      setShowBottomFade(!atBottom);
    }, []);

    React.useEffect(() => {
      updateBottomFadeVisibility();
      const el = scrollRef.current;
      if (!el) return;

      const onScroll = () => updateBottomFadeVisibility();
      el.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', updateBottomFadeVisibility);

      return () => {
        el.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', updateBottomFadeVisibility);
      };
    }, [places, updateBottomFadeVisibility]);

    return (
      <div
        ref={ref}
        className={cn(
          'absolute inset-y-0 bottom-4 left-0 z-20 w-[340px] max-w-[75%] pointer-events-auto',
          className
        )}
      >
        <div ref={scrollRef} className="relative px-2 h-full overflow-y-auto bg-surface">
          {/* Header */}
          <div className="flex justify-between flex-row items-center px-3 sticky bg-surface top-0 py-4 text-md font-medium">
            <span className="text-primary">{places.length} results</span>
            <Settings className="h-5 w-5 text-secondary" aria-hidden="true" />
          </div>

          {/* Place list */}
          <div>
            {places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                isSelected={selectedId === place.id}
                onClick={() => onSelect(place)}
              />
            ))}
          </div>
        </div>

        {/* Bottom fade gradient */}
        {showBottomFade && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-9 z-10 transition-opacity duration-200"
            aria-hidden="true"
          >
            <div
              className="w-full h-full bg-gradient-to-t from-black/15 to-transparent dark:from-white/15"
              style={{
                WebkitMaskImage:
                  'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 25%, rgba(0,0,0,0.25) 75%, rgba(0,0,0,0) 100%)',
                maskImage:
                  'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 25%, rgba(0,0,0,0.25) 75%, rgba(0,0,0,0) 100%)',
              }}
            />
          </div>
        )}
      </div>
    );
  }
);
PlaceList.displayName = 'PlaceList';
