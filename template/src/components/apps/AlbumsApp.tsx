import * as React from "react"
import { Albums } from "../album"

/**
 * Production-ready Albums App
 *
 * This app displays photo albums in a carousel layout with fullscreen viewing capability.
 * Can be dropped into any production environment without changes.
 */
export const AlbumsApp = React.forwardRef<HTMLDivElement>((_props, ref) => {
  return <Albums ref={ref} />
})
AlbumsApp.displayName = "AlbumsApp"
