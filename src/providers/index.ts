/**
 * Provider abstraction for widget runtime environments.
 *
 * This module provides a clean, provider-agnostic API for accessing widget
 * runtime functionality. It delegates to the runtime detection module to find
 * the appropriate provider implementation.
 *
 * The abstraction layer is designed to be completely independent of any specific
 * provider (like OpenAI/ChatGPT), allowing new providers to be plugged in by
 * implementing the WidgetProvider interface.
 */

import type { WidgetProvider, WidgetGlobals, WidgetAPI } from './types';
import {
  detectProvider,
  isProviderAvailable as checkProviderAvailable,
  resetProviderCache as resetCache,
} from './provider-detection';

// Re-export provider-agnostic types
export type { WidgetGlobals, WidgetAPI, WidgetProvider } from './types';

/**
 * Get the detected provider for the current environment.
 *
 * @returns The detected provider, or null if no provider is available.
 */
export function getProvider(): WidgetProvider | null {
  return detectProvider();
}

/**
 * Check if any provider is available.
 */
export function isProviderAvailable(): boolean {
  return checkProviderAvailable();
}

/**
 * Get a global value from the detected provider.
 *
 * @param key - The global property key to retrieve.
 * @returns The value, or null if not available.
 */
export function getGlobal<K extends keyof WidgetGlobals>(
  key: K
): WidgetGlobals[K] | null {
  const provider = getProvider();
  return provider?.getGlobal(key) ?? null;
}

/**
 * Subscribe to changes for a global property.
 *
 * @param key - The global property key to subscribe to.
 * @param onChange - Callback to invoke when the value changes.
 * @returns An unsubscribe function.
 */
export function subscribeToGlobal(
  key: keyof WidgetGlobals,
  onChange: () => void
): () => void {
  const provider = getProvider();
  return provider?.subscribe(key, onChange) ?? (() => {});
}

/**
 * Get the API from the detected provider.
 *
 * @returns The API object, or null if not available.
 */
export function getAPI(): WidgetAPI | null {
  const provider = getProvider();
  return provider?.getAPI() ?? null;
}

/**
 * Reset the provider detection cache.
 * Useful for testing or when the environment changes.
 */
export function resetProviderCache(): void {
  resetCache();
}
