import * as React from 'react';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { cn } from '../../lib/index';
import type { Album } from './albums';

export type AlbumCardProps = {
  album: Album;
  onSelect?: (album: Album) => void;
  className?: string;
  buttonSize?: 'xs' | 'sm' | 'md' | 'lg';
};

export const AlbumCard = React.forwardRef<HTMLButtonElement, AlbumCardProps>(
  ({ album, onSelect, className, buttonSize = 'md' }, ref) => {
    return (
      <Button
        ref={ref}
        variant="ghost"
        color="secondary"
        size={buttonSize}
        className={cn(
          'rounded-xl flex-shrink-0 w-full h-full p-0 text-left flex flex-col [&:hover]:bg-transparent hover:bg-transparent cursor-pointer',
          className
        )}
        onClick={() => onSelect?.(album)}
      >
        <div className="aspect-[4/3] w-full overflow-hidden rounded-xl flex-shrink-0">
          <img
            src={album.cover}
            alt={album.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex-shrink-0 w-full p-2">
          <div className="text-base font-normal text-primary">{album.title}</div>
          <div className="text-sm text-secondary">
            {album.photos.length} {album.photos.length === 1 ? 'photo' : 'photos'}
          </div>
        </div>
      </Button>
    );
  }
);
AlbumCard.displayName = 'AlbumCard';
