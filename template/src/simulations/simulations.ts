/**
 * Simulations - combines apps with their simulation configs
 *
 * This file creates simulations by pairing production-ready apps with their
 * server-safe configs. Each simulation is used for development and testing.
 *
 * IMPORTANT: This file imports React components and CSS. Do not import this
 * in Node.js/MCP server contexts. Use app-configs.ts instead.
 *
 * To switch apps, change ACTIVE_APP in components/apps/active-app.ts
 */

import type { Simulation } from "sunpeak"
import type { ComponentType } from "react"
import { App } from "../components/apps/App"
import { AlbumsApp } from "../components/apps/AlbumsApp"
import { PlacesApp } from "../components/apps/PlacesApp"
import { CONFIG_MAP, ACTIVE_APP } from "./app-configs"

export const appSimulation: Simulation = {
  ...CONFIG_MAP.app,
  component: App,
}

export const albumsSimulation: Simulation = {
  ...CONFIG_MAP.albums,
  component: AlbumsApp,
}

export const carouselSimulation: Simulation = {
  ...CONFIG_MAP.carousel,
  component: PlacesApp,
}

export const simulations = [
  appSimulation,
  carouselSimulation,
  albumsSimulation,
]

/**
 * Static map from simulation name to simulation config and component
 */
export const APP_MAP = {
  app: {
    config: CONFIG_MAP.app,
    component: App,
    simulation: appSimulation,
  },
  albums: {
    config: CONFIG_MAP.albums,
    component: AlbumsApp,
    simulation: albumsSimulation,
  },
  carousel: {
    config: CONFIG_MAP.carousel,
    component: PlacesApp,
    simulation: carouselSimulation,
  },
} as const satisfies Record<string, {
  config: typeof CONFIG_MAP[keyof typeof CONFIG_MAP];
  component: ComponentType;
  simulation: Simulation;
}>;

export type AppName = keyof typeof APP_MAP;

// Re-export for convenience
export { ACTIVE_APP, CONFIG_MAP };

// Derived exports for convenience
export const activeSimulation = APP_MAP[ACTIVE_APP].simulation;
export const activeConfig = APP_MAP[ACTIVE_APP].config;
export const ActiveComponent = APP_MAP[ACTIVE_APP].component;
