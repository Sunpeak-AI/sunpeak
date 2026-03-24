/**
 * Host detection utilities for MCP Apps.
 *
 * Use these functions to detect which host is running your app
 * and conditionally use host-specific features.
 *
 * @example
 * ```tsx
 * import { isChatGPT } from 'sunpeak/host';
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
 * Supported hosts.
 */
export type Host = 'chatgpt' | 'claude' | 'unknown';

/**
 * Detect the current host.
 *
 * Detection is based on:
 * 1. Host runtime objects (window.openai for ChatGPT — works in both
 *    real hosts and the inspector when the ChatGPT host shell is active)
 * 2. User agent patterns as fallback
 * 3. Hostname matching as final fallback
 *
 * @returns The detected host
 */
export function detectHost(): Host {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  // ChatGPT injects window.openai; the inspector does the same when
  // the ChatGPT host shell is selected. This is the most reliable signal.
  if ('openai' in window) {
    return 'chatgpt';
  }

  // Check user agent patterns for host detection
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
 * import { isChatGPT } from 'sunpeak/host';
 *
 * function MyResource() {
 *   if (isChatGPT()) {
 *     // Use ChatGPT-specific features
 *   }
 * }
 * ```
 */
export function isChatGPT(): boolean {
  return detectHost() === 'chatgpt';
}

/**
 * Check if the app is running in a Claude host.
 *
 * @returns true if running in Claude
 */
export function isClaude(): boolean {
  return detectHost() === 'claude';
}
