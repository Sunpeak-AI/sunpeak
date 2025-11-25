import type { Simulation } from "sunpeak"
import { App } from "../../App"

export const appSimulation: Simulation = {
  value: 'app',
  label: 'My App',
  component: App,
  appName: 'sunpeak',
  appIcon: '🏗️',
  userMessage: 'What do you have for me today?',
  toolOutput: null,
  widgetState: null,
}
