import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '../../../lib/index';
import type { Place } from './types';

// Public Mapbox token for demo purposes
mapboxgl.accessToken =
  'pk.eyJ1IjoiZXJpY25pbmciLCJhIjoiY21icXlubWM1MDRiczJvb2xwM2p0amNyayJ9.n-3O6JI5nOp_Lw96ZO5vJQ';

export type MapViewProps = {
  places: Place[];
  selectedPlace: Place | null;
  isFullscreen: boolean;
  onSelectPlace: (place: Place) => void;
  maxHeight?: number | null;
  className?: string;
};

function fitMapToMarkers(map: mapboxgl.Map, coords: [number, number][]) {
  if (!map || !coords.length) return;
  if (coords.length === 1) {
    map.flyTo({ center: coords[0], zoom: 12 });
    return;
  }
  const bounds = coords.reduce(
    (b, c) => b.extend(c),
    new mapboxgl.LngLatBounds(coords[0], coords[0])
  );
  map.fitBounds(bounds, { padding: 60, animate: true });
}

export function MapView({
  places,
  selectedPlace,
  isFullscreen,
  onSelectPlace,
  maxHeight,
  className,
}: MapViewProps) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapObj = React.useRef<mapboxgl.Map | null>(null);
  const markerObjs = React.useRef<mapboxgl.Marker[]>([]);

  const markerCoords = React.useMemo(() => places.map((p) => p.coords), [places]);

  // Track if initial fit has happened
  const hasFittedRef = React.useRef(false);

  // Initialize map
  React.useEffect(() => {
    if (mapObj.current || !mapRef.current) return;

    // Default to San Francisco if no coords yet
    const defaultCenter: [number, number] = [-122.4194, 37.7749];

    mapObj.current = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: defaultCenter,
      zoom: 12,
      attributionControl: false,
    });

    // Resize after first paint
    requestAnimationFrame(() => {
      mapObj.current?.resize();
    });

    // Handle window resize
    const handleResize = () => mapObj.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mapObj.current?.remove();
      mapObj.current = null;
    };
  }, []);

  // Helper function to get inspector offset
  const getInspectorOffsetPx = React.useCallback((): number => {
    if (!isFullscreen) return 0;
    if (typeof window === 'undefined') return 0;

    const isXlUp = window.matchMedia && window.matchMedia('(min-width: 1280px)').matches;
    const el = document.querySelector('.map-inspector');
    const w = el ? el.getBoundingClientRect().width : 360;
    const half = Math.round(w / 2);

    // xl: inspector on right → negative x offset; lg: inspector on left → positive x offset
    return isXlUp ? -half : half;
  }, [isFullscreen]);

  // Helper function to pan to a place
  const panToPlace = React.useCallback(
    (place: Place, offsetForInspector = false) => {
      if (!mapObj.current) return;

      // Validate coords before panning
      if (!place.coords || !Array.isArray(place.coords) || place.coords.length !== 2) {
        return;
      }

      const inspectorOffset = offsetForInspector ? getInspectorOffsetPx() : 0;
      const flyOpts: Parameters<typeof mapObj.current.flyTo>[0] = {
        center: place.coords,
        zoom: 14,
        speed: 1.2,
        curve: 1.6,
      };

      if (inspectorOffset) {
        flyOpts.offset = [inspectorOffset, 0];
      }

      mapObj.current.flyTo(flyOpts);
    },
    [getInspectorOffsetPx]
  );

  // Fit to markers when places data loads
  React.useEffect(() => {
    if (!mapObj.current || markerCoords.length === 0) return;

    // Validate all coords are valid
    const allCoordsValid = markerCoords.every(
      (coord) => Array.isArray(coord) && coord.length === 2
    );
    if (!allCoordsValid) return;

    // Only auto-fit on initial load, not on every places change
    if (!hasFittedRef.current) {
      hasFittedRef.current = true;
      // Wait for map to be ready
      if (mapObj.current.loaded()) {
        fitMapToMarkers(mapObj.current, markerCoords);
      } else {
        mapObj.current.once('load', () => {
          if (mapObj.current) {
            fitMapToMarkers(mapObj.current, markerCoords);
          }
        });
      }
    }
  }, [markerCoords]);

  // Add markers when places change
  React.useEffect(() => {
    if (!mapObj.current) return;

    // Remove existing markers
    markerObjs.current.forEach((m) => m.remove());
    markerObjs.current = [];

    // Add new markers
    places.forEach((place) => {
      // Validate coords before creating marker
      if (!place.coords || !Array.isArray(place.coords) || place.coords.length !== 2) {
        return;
      }

      const marker = new mapboxgl.Marker({
        color: '#F46C21',
      })
        .setLngLat(place.coords)
        .addTo(mapObj.current!);

      const el = marker.getElement();
      if (el) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          onSelectPlace(place);
          panToPlace(place, true);
        });
      }
      markerObjs.current.push(marker);
    });
  }, [places, onSelectPlace, panToPlace]);

  // Pan to selected place
  React.useEffect(() => {
    if (!mapObj.current || !selectedPlace) return;
    panToPlace(selectedPlace, true);
  }, [selectedPlace, panToPlace]);

  // Resize map when display mode or height changes
  React.useEffect(() => {
    if (!mapObj.current) return;
    mapObj.current.resize();
  }, [maxHeight, isFullscreen]);

  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden',
        isFullscreen &&
          'left-[340px] right-2 top-2 bottom-4 border border-black/10 dark:border-white/10 rounded-3xl',
        className
      )}
    >
      <div
        ref={mapRef}
        className="w-full h-full absolute bottom-0 left-0 right-0"
        style={{
          maxHeight: maxHeight ?? undefined,
          height: isFullscreen ? (maxHeight ?? undefined) : undefined,
        }}
      />
    </div>
  );
}
