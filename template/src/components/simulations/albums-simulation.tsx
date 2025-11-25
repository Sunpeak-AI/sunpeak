import * as React from "react"
import type { Simulation } from "sunpeak"
import { OpenAIAlbums } from ".."
import albumsData from "../../../data/albums.json"

const AlbumsComponent = React.forwardRef<HTMLDivElement>((_props, ref) => {
  return <OpenAIAlbums ref={ref} />
})
AlbumsComponent.displayName = "AlbumsComponent"

export const albumsSimulation: Simulation = {
  value: 'albums',
  label: 'Albums',
  component: AlbumsComponent,
  appName: 'Pizzaz',
  appIcon: '🍕',
  userMessage: 'Pizza time',
  toolOutput: albumsData,
  widgetState: null,
}
