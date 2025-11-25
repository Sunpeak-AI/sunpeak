export * from "./app-simulation"
export * from "./carousel-simulation"
export * from "./albums-simulation"

// Export all simulations as an array for convenience
import { appSimulation } from "./app-simulation"
import { carouselSimulation } from "./carousel-simulation"
import { albumsSimulation } from "./albums-simulation"

export const simulations = [
  appSimulation,
  carouselSimulation,
  albumsSimulation,
]
