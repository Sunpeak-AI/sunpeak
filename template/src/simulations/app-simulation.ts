/**
 * Server-safe configuration for the app simulation.
 * This file contains only metadata and doesn't import React components or CSS.
 */
export const appSimulationConfig = {
  appName: 'sunpeak',
  value: 'app',
  label: 'My App',
  appIcon: '🏗️',
  userMessage: 'What do you have for me today?',
  toolOutput: null,
  widgetState: null,
  toolName: 'show-app',
  toolDescription: 'Show the Sunpeak app',
} as const;
