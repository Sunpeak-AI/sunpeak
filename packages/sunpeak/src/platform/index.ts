/**
 * Platform detection utilities for MCP Apps.
 *
 * Use these functions to detect which host platform is running your app
 * and conditionally use platform-specific features.
 *
 * @example
 * ```tsx
 * import { isChatGPT } from 'sunpeak/platform';
 *
 * function MyResource() {
 *   // Only use ChatGPT-specific features when running on ChatGPT
 *   if (isChatGPT()) {
 *     // Use updateModelContext, etc.
 *   }
 * }
 * ```
 */

/**
 * Supported host platforms.
 */
export type Platform = 'chatgpt' | 'claude' | 'unknown';

/**
 * Detect the current host platform.
 *
 * Detection is based on:
 * 1. Host context platform field (when available)
 * 2. User agent patterns as fallback
 *
 * @returns The detected platform
 */
export function detectPlatform(): Platform {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  // Check user agent patterns for platform detection
  const ua = navigator.userAgent.toLowerCase();

  // ChatGPT iOS/Android apps and web
  if (ua.includes('chatgpt') || window.location.hostname.includes('chatgpt.com')) {
    return 'chatgpt';
  }

  // Claude apps and web
  if (ua.includes('claude') || window.location.hostname.includes('claude.ai')) {
    return 'claude';
  }

  return 'unknown';
}

/**
 * Check if the app is running in a ChatGPT host.
 *
 * @returns true if running in ChatGPT
 *
 * @example
 * ```tsx
 * import { isChatGPT } from 'sunpeak/platform';
 *
 * function MyResource() {
 *   if (isChatGPT()) {
 *     // Use ChatGPT-specific features
 *   }
 * }
 * ```
 */
export function isChatGPT(): boolean {
  return detectPlatform() === 'chatgpt';
}

/**
 * Check if the app is running in a Claude host.
 *
 * @returns true if running in Claude
 */
export function isClaude(): boolean {
  return detectPlatform() === 'claude';
}
