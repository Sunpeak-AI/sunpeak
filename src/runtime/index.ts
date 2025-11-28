/**
 * Runtime utilities for widget environments.
 *
 * This module contains runtime-specific logic like provider detection
 * that needs to know about concrete provider implementations.
 */

export {
  detectProvider,
  isProviderAvailable,
  resetProviderCache,
} from './provider-detection';
