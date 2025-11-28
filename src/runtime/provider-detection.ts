/**
 * Provider detection and routing.
 *
 * This module knows about concrete provider implementations and handles
 * detecting which one is available. It imports from provider-specific
 * directories to enable routing, while the core providers abstraction
 * remains clean and provider-agnostic.
 */

import type { WidgetProvider } from '../providers/types';
import { isOpenAiAvailable, getOpenAiProvider } from '../providers/openai';

// Cached provider instance - detection happens only once
let cachedProvider: WidgetProvider | null = null;
let detectionComplete = false;

/**
 * Detect and return the appropriate provider for the current environment.
 * This function caches the result, so detection only happens once.
 *
 * @returns The detected provider, or null if no provider is available.
 */
export function detectProvider(): WidgetProvider | null {
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
  return detectProvider() !== null;
}

/**
 * Reset the provider detection cache.
 * Useful for testing or when the environment changes.
 */
export function resetProviderCache(): void {
  cachedProvider = null;
  detectionComplete = false;
}
