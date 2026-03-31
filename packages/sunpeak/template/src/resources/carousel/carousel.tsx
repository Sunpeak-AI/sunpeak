import { useState, useRef, useCallback } from 'react';
import {
  useToolData,
  useDeviceCapabilities,
  useDisplayMode,
  useRequestDisplayMode,
  SafeArea,
} from 'sunpeak';
import type { ResourceConfig } from 'sunpeak';
import { Carousel, Card, PlaceDetail } from './components';
import type { PlaceDetailData } from './components';

export const resource: ResourceConfig = {
  title: 'Carousel',
  description: 'Show popular places to visit widget',
  mimeType: 'text/html;profile=mcp-app',
  _meta: {
    ui: {
      csp: {
        resourceDomains: ['https://cdn.sunpeak.ai'],
      },
    },
  },
};

/**
 * Production-ready Carousel Resource
 *
 * This resource displays places in a carousel layout with cards.
 * Click a card to open it fullscreen with detailed information.
 */

type CarouselCard = PlaceDetailData;

interface CarouselInput {
  city?: string;
  state?: string;
  categories?: string[];
  limit?: number;
}

interface CarouselData {
  places: CarouselCard[];
}

export function CarouselResource() {
  const { output, inputPartial, isLoading, isError, isCancelled, cancelReason } = useToolData<
    CarouselInput,
    CarouselData
  >();
  const { touch: hasTouch = false } = useDeviceCapabilities();
  const displayMode = useDisplayMode();
  const { requestDisplayMode } = useRequestDisplayMode();
  const [selectedPlace, setSelectedPlace] = useState<CarouselCard | null>(null);
  const isDraggingRef = useRef(false);
  const places = output?.places ?? [];

  // Only show detail view when actually in fullscreen. If the host externally
  // switches back to inline, the condition below naturally falls through to the
  // carousel without needing to clear selectedPlace via an effect.
  const showDetail = displayMode === 'fullscreen' && selectedPlace !== null;

  const handleDraggingChange = useCallback((dragging: boolean) => {
    isDraggingRef.current = dragging;
  }, []);

  if (isLoading) {
    const searchContext = inputPartial?.city;
    return (
      <SafeArea className="flex items-center justify-center gap-2 p-8 text-[var(--color-text-secondary)]">
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span>{searchContext ? `Finding places in ${searchContext}…` : 'Loading places…'}</span>
      </SafeArea>
    );
  }

  if (isError) {
    return (
      <SafeArea className="flex items-center justify-center p-8 text-[var(--color-text-secondary)]">
        Failed to load places
      </SafeArea>
    );
  }

  if (isCancelled) {
    return (
      <SafeArea className="flex items-center justify-center p-8 text-[var(--color-text-secondary)]">
        {cancelReason ?? 'Request was cancelled'}
      </SafeArea>
    );
  }

  if (places.length === 0) {
    return (
      <SafeArea className="flex items-center justify-center p-8 text-[var(--color-text-secondary)]">
        No places found
      </SafeArea>
    );
  }

  const handleCardClick = async (place: CarouselCard) => {
    if (isDraggingRef.current) return;
    setSelectedPlace(place);
    await requestDisplayMode('fullscreen');
  };

  if (showDetail) {
    return (
      <SafeArea className="h-full">
        <PlaceDetail place={selectedPlace} buttonSize={hasTouch ? 'md' : 'sm'} />
      </SafeArea>
    );
  }

  return (
    <SafeArea className="p-4">
      <Carousel
        gap={16}
        showArrows={true}
        showEdgeGradients={true}
        cardWidth={220}
        displayMode={displayMode}
        onDraggingChange={handleDraggingChange}
      >
        {places.map((place: CarouselCard) => (
          <Card
            key={place.id}
            image={place.image}
            imageAlt={place.name}
            header={place.name}
            metadata={`⭐ ${place.rating} • ${place.category} • ${place.location}`}
            buttonSize={hasTouch ? 'md' : 'sm'}
            onClick={() => handleCardClick(place)}
            button1={{
              isPrimary: true,
              onClick: () => console.log(`Visit ${place.name}`),
              children: 'Visit',
            }}
            button2={{
              isPrimary: false,
              onClick: () => handleCardClick(place),
              children: 'Learn More',
            }}
          >
            {place.description}
          </Card>
        ))}
      </Carousel>
    </SafeArea>
  );
}
