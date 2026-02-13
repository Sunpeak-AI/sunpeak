import * as React from 'react';
import { useApp, useAppState, useDisplayMode, useToolData, useHostContext } from 'sunpeak';
import { AlbumCarousel } from './album-carousel';
import { AlbumCard } from './album-card';
import { FullscreenViewer } from './fullscreen-viewer';

export interface Album {
  id: string;
  title: string;
  cover: string;
  photos: Array<{
    id: string;
    title: string;
    url: string;
  }>;
}

export interface AlbumsData {
  albums: Album[];
}

interface AlbumsState {
  selectedAlbumId: string | null;
}

export type AlbumsProps = {
  className?: string;
};

export function Albums({ className }: AlbumsProps) {
  const app = useApp();
  const { output } = useToolData<unknown, AlbumsData>(undefined, { albums: [] });
  const [state, setState] = useAppState<AlbumsState>({
    selectedAlbumId: null,
  });
  const displayMode = useDisplayMode();
  const context = useHostContext();

  const albums = output?.albums ?? [];
  const selectedAlbum = albums.find((album: Album) => album.id === state.selectedAlbumId);
  const hasTouch = context?.deviceCapabilities?.touch ?? false;

  const handleSelectAlbum = React.useCallback(
    (album: Album) => {
      setState((prev) => ({ ...prev, selectedAlbumId: album.id }));
      app?.requestDisplayMode({ mode: 'fullscreen' });
    },
    [setState, app]
  );

  if (displayMode === 'fullscreen' && selectedAlbum) {
    return <FullscreenViewer album={selectedAlbum} />;
  }

  return (
    <div className={className}>
      <AlbumCarousel
        gap={20}
        showArrows={false}
        showEdgeGradients={false}
        cardWidth={272}
        displayMode={displayMode}
      >
        {albums.map((album: Album) => (
          <AlbumCard
            key={album.id}
            album={album}
            onSelect={handleSelectAlbum}
            buttonSize={hasTouch ? 'lg' : 'md'}
          />
        ))}
      </AlbumCarousel>
    </div>
  );
}
