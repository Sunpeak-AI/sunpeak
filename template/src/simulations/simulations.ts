/**
 * Simulations - combines tools with their simulation configs
 *
 * This file creates simulations by pairing production-ready tools with their
 * server-safe configs. Each simulation is used for development and testing.
 *
 * IMPORTANT: This file imports React components and CSS. Do not import this
 * in Node.js/MCP server contexts. Use tool-configs.ts instead.
 */

import type { Simulation } from "sunpeak"
import { CounterTool } from "../components/tools/CounterTool"
import { AlbumsTool } from "../components/tools/AlbumsTool"
import { PlacesTool } from "../components/tools/PlacesTool"
import { TOOL_CONFIGS } from "./tool-configs"

export const counterSimulation: Simulation = {
  ...TOOL_CONFIGS.counter,
  component: CounterTool,
}

export const albumsSimulation: Simulation = {
  ...TOOL_CONFIGS.albums,
  component: AlbumsTool,
}

export const carouselSimulation: Simulation = {
  ...TOOL_CONFIGS.carousel,
  component: PlacesTool,
}

export const simulations: Simulation[] = [
  counterSimulation,
  carouselSimulation,
  albumsSimulation,
]
