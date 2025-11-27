/**
 * Simulations - combines resources with their simulation configs
 *
 * This file creates simulations by pairing production-ready resources with their
 * server-safe configs. Each simulation is used for development and testing.
 *
 * IMPORTANT: This file imports React components and CSS. Do not import this
 * in Node.js/MCP server contexts. Use simulation-configs.ts instead.
 */

import type { Simulation } from "sunpeak"
import { CounterResource } from "../components/resources/CounterResource"
import { AlbumsResource } from "../components/resources/AlbumsResource"
import { PlacesResource } from "../components/resources/PlacesResource"
import { SIMULATIONS } from "./simulation-configs"

export const counterSimulation: Simulation = {
  ...SIMULATIONS.counter,
  resourceComponent: CounterResource,
}

export const albumsSimulation: Simulation = {
  ...SIMULATIONS.albums,
  resourceComponent: AlbumsResource,
}

export const carouselSimulation: Simulation = {
  ...SIMULATIONS.carousel,
  resourceComponent: PlacesResource,
}

export const simulations: Simulation[] = [
  counterSimulation,
  carouselSimulation,
  albumsSimulation,
]
