import * as React from 'react';
import { useMaxHeight, useSafeArea } from 'sunpeak';
import { cn } from '../../lib/index';
import { FilmStrip } from './film-strip';
import type { Album } from './albums';

export type FullscreenViewerProps = {
  album: Album;
  className?: string;
};

export const FullscreenViewer = React.forwardRef<HTMLDivElement, FullscreenViewerProps>(
  ({ album, className }, ref) => {
    const maxHeight = useMaxHeight();
    const safeArea = useSafeArea();
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

    // Combine refs
    React.useImperativeHandle(ref, () => containerRef.current!);

    const selectedPhoto = album?.photos?.[selectedIndex];
    const isMobile = width > 0 && width < 768;

    return (
      <div
        ref={containerRef}
        className={cn('relative w-full h-full bg-surface', className)}
        style={{
          maxHeight: maxHeight ?? undefined,
          height: maxHeight ?? undefined,
          ['--safe-top' as string]: `${safeArea?.insets.top ?? 0}px`,
          ['--safe-bottom' as string]: `${safeArea?.insets.bottom ?? 0}px`,
          ['--safe-left' as string]: `${safeArea?.insets.left ?? 0}px`,
          ['--safe-right' as string]: `${safeArea?.insets.right ?? 0}px`,
        }}
      >
        <div className={cn('absolute inset-0 flex overflow-hidden', isMobile ? 'flex-col' : 'flex-row')}>
          {/* Album header - mobile only */}
          {isMobile && (
            <div
              className="z-10 border-b border-subtle bg-surface/95 backdrop-blur-sm"
              style={{
                paddingTop: `calc(0.75rem + var(--safe-top))`,
                paddingBottom: '0.75rem',
                paddingLeft: `calc(1rem + var(--safe-left))`,
                paddingRight: `calc(1rem + var(--safe-right))`,
              }}
            >
              <h2 className="text-base font-semibold text-primary">{album.title}</h2>
              <p className="text-sm text-secondary">
                {selectedIndex + 1} / {album.photos.length}
              </p>
            </div>
          )}

          {/* Film strip - desktop only */}
          {!isMobile && (
            <div
              className="absolute pointer-events-none z-10 left-0 top-0 bottom-0 w-40"
              style={{
                paddingLeft: `var(--safe-left)`,
              }}
            >
              <FilmStrip album={album} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
            </div>
          )}

          {/* Main photo */}
          <div
            className="flex-1 min-w-0 relative flex items-center justify-center"
            style={{
              paddingTop: isMobile
                ? `calc(1rem + var(--safe-top))`
                : `calc(2.5rem + var(--safe-top))`,
              paddingBottom: isMobile
                ? `calc(1rem + var(--safe-bottom))`
                : `calc(2.5rem + var(--safe-bottom))`,
              paddingLeft: isMobile
                ? `calc(1rem + var(--safe-left))`
                : `calc(10rem + var(--safe-left))`,
              paddingRight: isMobile
                ? `calc(1rem + var(--safe-right))`
                : `calc(10rem + var(--safe-right))`,
            }}
          >
            <div className="relative w-full h-full">
              {selectedPhoto ? (
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.title || album.title}
                  className="absolute inset-0 m-auto rounded-3xl shadow-sm border border-primary/10 max-w-full max-h-full object-contain"
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
FullscreenViewer.displayName = 'FullscreenViewer';
