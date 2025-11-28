import * as React from "react"
import { Albums } from "../album/albums"

/**
 * Production-ready Albums Resource
 *
 * This resource displays photo albums in a carousel layout with fullscreen viewing capability.
 * Can be dropped into any production environment without changes.
 */
export const AlbumsResource = React.forwardRef<HTMLDivElement>((_props, ref) => {
  return <Albums ref={ref} />
})
AlbumsResource.displayName = "AlbumsResource"
