/**
 * Provider detection and routing.
 *
 * This module automatically detects which widget runtime environment is available
 * and provides the appropriate provider. The detection happens once on first access,
 * and subsequent calls return the cached provider directly.
 */

import type { WidgetProvider, WidgetGlobals, WidgetAPI } from './types';
import { isOpenAiAvailable, getOpenAiProvider } from '../chatgpt/openai-provider';

// Re-export only provider-specific types (not the shared types already in ./types)
export type { WidgetGlobals, WidgetAPI, WidgetProvider } from './types';
export { isOpenAiAvailable, getOpenAiProvider } from '../chatgpt/openai-provider';

// Cached provider instance - detection happens only once
let cachedProvider: WidgetProvider | null = null;
let detectionComplete = false;

/**
 * Detect and return the appropriate provider for the current environment.
 * This function caches the result, so detection only happens once.
 *
 * @returns The detected provider, or null if no provider is available.
 */
export function getProvider(): WidgetProvider | null {
  if (detectionComplete) {
    return cachedProvider;
  }

  // Detect available provider (order matters for priority)
  if (isOpenAiAvailable()) {
    cachedProvider = getOpenAiProvider();
  }
  // Future providers can be added here:
  // else if (isSomeOtherProviderAvailable()) {
  //   cachedProvider = getSomeOtherProvider();
  // }

  detectionComplete = true;
  return cachedProvider;
}

/**
 * Check if any provider is available.
 */
export function isProviderAvailable(): boolean {
  return getProvider() !== null;
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
  cachedProvider = null;
  detectionComplete = false;
}
