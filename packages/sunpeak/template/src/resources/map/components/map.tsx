import * as React from 'react';
import { useAppState, useDisplayMode, useToolData, useViewport } from 'sunpeak';
import type { App } from 'sunpeak';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { ExpandLg } from '@openai/apps-sdk-ui/components/Icon';
import { cn } from '../../../lib/index';
import { PlaceList } from './place-list';
import { PlaceCarousel } from './place-carousel';
import { PlaceInspector } from './place-inspector';
import { MapView } from './map-view';
import type { Place, MapData } from './types';

interface MapState {
  selectedPlaceId: string | null;
}

export type MapProps = {
  app: App | null;
  className?: string;
};

export function Map({ app, className }: MapProps) {
  const { output } = useToolData<unknown, MapData>(app, undefined, { places: [] });
  const [state, setState] = useAppState<MapState>(app, {
    selectedPlaceId: null,
  });
  const displayMode = useDisplayMode(app);
  const viewport = useViewport(app);

  const maxHeight = viewport?.maxHeight ?? null;
  const places = output?.places ?? [];
  const selectedPlace = places.find((place: Place) => place.id === state.selectedPlaceId);
  const isFullscreen = displayMode === 'fullscreen';

  const handleSelectPlace = React.useCallback(
    (place: Place) => {
      setState((prev) => ({ ...prev, selectedPlaceId: place.id }));
    },
    [setState]
  );

  const handleCloseInspector = React.useCallback(() => {
    setState((prev) => ({ ...prev, selectedPlaceId: null }));
  }, [setState]);

  const handleRequestFullscreen = React.useCallback(() => {
    // Clear selection when entering fullscreen from embedded mode
    if (state.selectedPlaceId) {
      setState((prev) => ({ ...prev, selectedPlaceId: null }));
    }
    app?.requestDisplayMode({ mode: 'fullscreen' });
  }, [app, state.selectedPlaceId, setState]);

  const containerHeight = isFullscreen ? (maxHeight ?? 600) - 40 : 480;

  return (
    <div
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
            selectedId={state.selectedPlaceId}
            onSelect={handleSelectPlace}
          />
        )}

        {/* Mobile bottom carousel - only in embedded mode */}
        {!isFullscreen && (
          <PlaceCarousel
            places={places}
            selectedId={state.selectedPlaceId}
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
          maxHeight={maxHeight}
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
}
