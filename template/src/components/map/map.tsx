import * as React from 'react';
import {
  useWidgetState,
  useDisplayMode,
  useWidgetAPI,
  useWidgetProps,
  useMaxHeight,
} from 'sunpeak';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { ExpandLg } from '@openai/apps-sdk-ui/components/Icon';
import { cn } from '../../lib/index';
import { PlaceList } from './place-list';
import { PlaceCarousel } from './place-carousel';
import { PlaceInspector } from './place-inspector';
import { MapView } from './map-view';
import type { Place, MapData } from '../../simulations/map-simulation';

export interface MapState extends Record<string, unknown> {
  selectedPlaceId?: string | null;
}

export type MapProps = {
  className?: string;
};

export const Map = React.forwardRef<HTMLDivElement, MapProps>(({ className }, ref) => {
  const data = useWidgetProps<MapData>(() => ({ places: [] }));
  const [widgetState, setWidgetState] = useWidgetState<MapState>(() => ({
    selectedPlaceId: null,
  }));
  const displayMode = useDisplayMode();
  const api = useWidgetAPI();
  const maxHeight = useMaxHeight();

  const places = data.places || [];
  const selectedPlace = places.find((place: Place) => place.id === widgetState?.selectedPlaceId);
  const isFullscreen = displayMode === 'fullscreen';

  const handleSelectPlace = React.useCallback(
    (place: Place) => {
      setWidgetState((prev) => ({ ...prev, selectedPlaceId: place.id }));
    },
    [setWidgetState]
  );

  const handleCloseInspector = React.useCallback(() => {
    setWidgetState((prev) => ({ ...prev, selectedPlaceId: null }));
  }, [setWidgetState]);

  const handleRequestFullscreen = React.useCallback(() => {
    // Clear selection when entering fullscreen from embedded mode
    if (widgetState?.selectedPlaceId) {
      setWidgetState((prev) => ({ ...prev, selectedPlaceId: null }));
    }
    api?.requestDisplayMode?.({ mode: 'fullscreen' });
  }, [api, widgetState?.selectedPlaceId, setWidgetState]);

  const containerHeight = isFullscreen ? (maxHeight ?? 600) - 40 : 480;

  return (
    <div
      ref={ref}
      className={cn('relative antialiased w-full overflow-hidden', className)}
      style={{
        height: containerHeight,
        minHeight: 480,
        maxHeight: maxHeight ?? undefined,
      }}
    >
      <div
        className={cn(
          'relative w-full h-full',
          isFullscreen
            ? 'rounded-none border-0'
            : 'border border-black/10 dark:border-white/10 rounded-2xl sm:rounded-3xl'
        )}
      >
        {/* Fullscreen button - only show in embedded mode */}
        {!isFullscreen && (
          <Button
            variant="solid"
            color="secondary"
            size="sm"
            className="absolute top-4 right-4 z-30 rounded-full shadow-lg"
            onClick={handleRequestFullscreen}
            aria-label="Enter fullscreen"
          >
            <ExpandLg className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}

        {/* Desktop sidebar - only in fullscreen */}
        {isFullscreen && (
          <PlaceList
            places={places}
            selectedId={widgetState?.selectedPlaceId ?? null}
            onSelect={handleSelectPlace}
          />
        )}

        {/* Mobile bottom carousel - only in embedded mode */}
        {!isFullscreen && (
          <PlaceCarousel
            places={places}
            selectedId={widgetState?.selectedPlaceId ?? null}
            onSelect={handleSelectPlace}
          />
        )}

        {/* Inspector (place details) - only in fullscreen */}
        {isFullscreen && selectedPlace && (
          <PlaceInspector place={selectedPlace} onClose={handleCloseInspector} />
        )}

        {/* Map */}
        <MapView
          places={places}
          selectedPlace={selectedPlace ?? null}
          isFullscreen={isFullscreen}
          onSelectPlace={handleSelectPlace}
        />

        {/* Suggestion chips - only in fullscreen */}
        {isFullscreen && (
          <div className="hidden md:flex absolute inset-x-0 bottom-2 z-30 justify-center pointer-events-none">
            <div className="flex gap-3 pointer-events-auto">
              {['Open now', 'Top rated', 'Vegetarian friendly'].map((label) => (
                <Button
                  key={label}
                  variant="solid"
                  color="secondary"
                  size="sm"
                  className="rounded-full shadow-md"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
Map.displayName = 'Map';
