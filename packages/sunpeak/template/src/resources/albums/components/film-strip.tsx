import * as React from 'react';
import { Button } from '../../../components/button';
import { cn } from '../../../lib/index';
import type { Album } from './albums';

export type FilmStripProps = {
  album: Album;
  selectedIndex: number;
  onSelect?: (index: number) => void;
  className?: string;
};

export const FilmStrip = React.forwardRef<HTMLDivElement, FilmStripProps>(
  ({ album, selectedIndex, onSelect, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'h-full w-full overflow-auto flex flex-col items-center justify-center p-5 space-y-5',
          className
        )}
      >
        {album.photos.map((photo, idx) => (
          <Button
            key={photo.id}
            variant="ghost"
            color="secondary"
            onClick={() => onSelect?.(idx)}
            className={cn(
              'block w-full h-auto p-[1px] pointer-events-auto rounded-[10px] border transition-all',
              idx === selectedIndex
                ? 'border-primary shadow-md'
                : 'border-transparent hover:border-primary/30 opacity-60 hover:opacity-100'
            )}
          >
            <div className="aspect-[5/3] rounded-lg overflow-hidden w-full">
              <img
                src={photo.url}
                alt={photo.title || `Photo ${idx + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </Button>
        ))}
      </div>
    );
  }
);
FilmStrip.displayName = 'FilmStrip';
