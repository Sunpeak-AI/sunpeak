import * as React from 'react';
import { SafeArea } from 'sunpeak';
import { cn } from '../../../lib/index';
import { FilmStrip } from './film-strip';
import type { Album } from './albums';

export type FullscreenViewerProps = {
  album: Album;
  className?: string;
};

export function FullscreenViewer({ album, className }: FullscreenViewerProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [width, setWidth] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [album?.id]);

  // Measure component width to determine mobile vs desktop layout
  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => {
      setWidth(element.getBoundingClientRect().width);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const selectedPhoto = album?.photos?.[selectedIndex];
  const isMobile = width > 0 && width < 768;

  return (
    <SafeArea
      ref={containerRef}
      className={cn(
        'min-h-dvh flex w-full bg-surface',
        isMobile ? 'flex-col' : 'flex-row',
        className
      )}
    >
      {/* Album header - mobile only */}
      {isMobile && (
        <div className="border-b border-subtle bg-surface/95 backdrop-blur-sm px-4 py-3">
          <h2 className="text-base font-semibold text-primary">{album.title}</h2>
          <p className="text-sm text-secondary">
            {selectedIndex + 1} / {album.photos.length}
          </p>
        </div>
      )}

      {/* Film strip - desktop only */}
      {!isMobile && (
        <div className="w-40 flex-shrink-0">
          <FilmStrip album={album} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
        </div>
      )}

      {/* Main photo */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-10">
        {selectedPhoto ? (
          <img
            src={selectedPhoto.url}
            alt={selectedPhoto.title || album.title}
            className="rounded-3xl shadow-sm border border-primary/10 max-w-full max-h-full object-contain"
          />
        ) : null}
      </div>
    </SafeArea>
  );
}
