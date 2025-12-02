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

    React.useEffect(() => {
      setSelectedIndex(0);
    }, [album?.id]);

    const selectedPhoto = album?.photos?.[selectedIndex];

    return (
      <div
        ref={ref}
        className={cn('relative w-full h-full bg-surface', className)}
        style={{
          maxHeight: maxHeight ?? undefined,
          height: maxHeight ?? undefined,
        }}
      >
        <div className="absolute inset-0 flex flex-row overflow-hidden">
          {/* Film strip */}
          <div
            className="hidden md:block absolute pointer-events-none z-10 left-0 top-0 bottom-0 w-40"
            style={{
              paddingLeft: `${safeArea?.insets.left ?? 0}px`,
            }}
          >
            <FilmStrip album={album} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
          </div>

          {/* Main photo */}
          <div
            className="flex-1 min-w-0 px-40 py-10 relative flex items-center justify-center"
            style={{
              paddingTop: `calc(2.5rem + ${safeArea?.insets.top ?? 0}px)`,
              paddingBottom: `calc(2.5rem + ${safeArea?.insets.bottom ?? 0}px)`,
              paddingLeft: `calc(10rem + ${safeArea?.insets.left ?? 0}px)`,
              paddingRight: `calc(10rem + ${safeArea?.insets.right ?? 0}px)`,
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
