import * as React from "react"
import { useWidgetState, useDisplayMode, useWidgetAPI, useWidgetProps } from "sunpeak"
import { Carousel } from "../carousel"
import { AlbumCard } from "./album-card"
import { FullscreenViewer } from "./fullscreen-viewer"

export interface Album {
  id: string
  title: string
  cover: string
  photos: Array<{
    id: string
    title: string
    url: string
  }>
}

export interface OpenAIAlbumsData extends Record<string, unknown> {
  albums: Album[]
}

export interface OpenAIAlbumsState extends Record<string, unknown> {
  selectedAlbumId?: string | null
}

export type OpenAIAlbumsProps = {
  className?: string
}

export const OpenAIAlbums = React.forwardRef<HTMLDivElement, OpenAIAlbumsProps>(
  ({ className }, ref) => {
    const data = useWidgetProps<OpenAIAlbumsData>(() => ({ albums: [] }))
    const [widgetState, setWidgetState] = useWidgetState<OpenAIAlbumsState>(() => ({
      selectedAlbumId: null,
    }))
    const displayMode = useDisplayMode()
    const api = useWidgetAPI()

    const albums = data.albums || []
    const selectedAlbum = albums.find(
      (album) => album.id === widgetState?.selectedAlbumId
    )

    const handleSelectAlbum = React.useCallback(
      (album: Album) => {
        setWidgetState({ selectedAlbumId: album.id })
        api?.requestDisplayMode?.({ mode: "fullscreen" })
      },
      [setWidgetState, api]
    )

    if (displayMode === "fullscreen" && selectedAlbum) {
      return (
        <FullscreenViewer
          ref={ref}
          album={selectedAlbum}
        />
      )
    }

    return (
      <div ref={ref} className={className}>
        <Carousel
          gap={20}
          showArrows={false}
          showEdgeGradients={false}
          cardWidth={272}
        >
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} onSelect={handleSelectAlbum} />
          ))}
        </Carousel>
      </div>
    )
  }
)
OpenAIAlbums.displayName = "OpenAIAlbums"
