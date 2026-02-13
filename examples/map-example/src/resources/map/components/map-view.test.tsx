import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapView } from './map-view';
import type { Place } from './types';

// Mock mapbox-gl
vi.mock('mapbox-gl', () => ({
  default: {
    accessToken: '',
    Map: class MockMap {
      on = vi.fn();
      once = vi.fn();
      remove = vi.fn();
      resize = vi.fn();
      loaded = vi.fn().mockReturnValue(true);
      flyTo = vi.fn();
      fitBounds = vi.fn();
    },
    Marker: class MockMarker {
      setLngLat = vi.fn().mockReturnThis();
      addTo = vi.fn().mockReturnThis();
      remove = vi.fn();
      getElement = vi.fn().mockReturnValue(document.createElement('div'));
    },
    LngLatBounds: class MockLngLatBounds {
      extend = vi.fn().mockReturnThis();
    },
  },
}));

describe('MapView', () => {
  const mockPlaces: Place[] = [
    {
      id: 'place-1',
      name: 'First Place',
      coords: [-122.4194, 37.7749],
      description: 'First test place',
      city: 'San Francisco',
      rating: 4.5,
      price: '$$',
      thumbnail: 'https://example.com/1.jpg',
    },
    {
      id: 'place-2',
      name: 'Second Place',
      coords: [-122.4094, 37.7849],
      description: 'Second test place',
      city: 'Oakland',
      rating: 4.2,
      price: '$',
      thumbnail: 'https://example.com/2.jpg',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders map container', () => {
    const { container } = render(
      <MapView
        places={mockPlaces}
        selectedPlace={null}
        isFullscreen={false}
        onSelectPlace={vi.fn()}
      />
    );

    const mapContainer = container.querySelector('div[class*="absolute"]');
    expect(mapContainer).toBeInTheDocument();
  });

  it('applies different styles for fullscreen mode', () => {
    const { container, rerender } = render(
      <MapView
        places={mockPlaces}
        selectedPlace={null}
        isFullscreen={false}
        onSelectPlace={vi.fn()}
      />
    );

    let mapWrapper = container.firstChild as HTMLElement;
    expect(mapWrapper.className).not.toContain('left-[340px]');

    rerender(
      <MapView
        places={mockPlaces}
        selectedPlace={null}
        isFullscreen={true}
        onSelectPlace={vi.fn()}
      />
    );

    mapWrapper = container.firstChild as HTMLElement;
    expect(mapWrapper.className).toContain('left-[340px]');
  });

  it('handles empty places array gracefully', () => {
    const { container } = render(
      <MapView places={[]} selectedPlace={null} isFullscreen={false} onSelectPlace={vi.fn()} />
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles places with invalid coordinates gracefully', () => {
    const invalidPlaces: Place[] = [
      {
        ...mockPlaces[0],
        coords: [] as unknown as [number, number],
      },
    ];

    const { container } = render(
      <MapView
        places={invalidPlaces}
        selectedPlace={null}
        isFullscreen={false}
        onSelectPlace={vi.fn()}
      />
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it('accepts custom className prop', () => {
    const { container } = render(
      <MapView
        places={mockPlaces}
        selectedPlace={null}
        isFullscreen={false}
        onSelectPlace={vi.fn()}
        className="custom-class"
      />
    );

    const mapWrapper = container.firstChild as HTMLElement;
    expect(mapWrapper.className).toContain('custom-class');
  });
});
