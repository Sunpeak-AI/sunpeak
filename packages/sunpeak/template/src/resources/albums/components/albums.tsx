import * as React from 'react';
import { useAppState, useDisplayMode, useToolData, useHostContext } from 'sunpeak';
import type { App } from 'sunpeak';
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
  app: App | null;
  className?: string;
};

export function Albums({ app, className }: AlbumsProps) {
  const { output } = useToolData<unknown, AlbumsData>(app, undefined, { albums: [] });
  const [state, setState] = useAppState<AlbumsState>(app, {
    selectedAlbumId: null,
  });
  const displayMode = useDisplayMode(app);
  const context = useHostContext(app);

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
    return <FullscreenViewer app={app} album={selectedAlbum} />;
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
