import type { Theme, DisplayMode, DeviceType } from '../types/runtime';

/**
 * Strongly-typed URL parameters for the ChatGPT Simulator.
 *
 * Use with `createSimulatorUrl()` to generate type-safe URL paths for e2e tests.
 *
 * @example
 * ```ts
 * import { createSimulatorUrl } from 'sunpeak/chatgpt';
 *
 * // In e2e tests:
 * await page.goto(createSimulatorUrl({
 *   simulation: 'albums-show',
 *   theme: 'dark',
 *   displayMode: 'fullscreen',
 * }));
 * ```
 */
export interface SimulatorUrlParams {
  /**
   * The simulation name to load (e.g., 'albums-show', 'review-diff').
   * Corresponds to the simulation JSON filename without the '-simulation.json' suffix.
   */
  simulation?: string;

  /**
   * The color theme for the simulator.
   * @default 'dark'
   */
  theme?: Theme;

  /**
   * The display mode for the widget.
   * - 'inline': Embedded in the conversation
   * - 'pip': Picture-in-picture mode with max height
   * - 'fullscreen': Full screen overlay
   * @default 'inline'
   */
  displayMode?: DisplayMode;

  /**
   * The locale for the simulator (e.g., 'en-US', 'ja-JP').
   * @default 'en-US'
   */
  locale?: string;

  /**
   * Maximum height in pixels for PiP mode.
   * Only applicable when displayMode is 'pip'.
   */
  maxHeight?: number;

  /**
   * The device type to simulate.
   * Affects default hover/touch capabilities.
   */
  deviceType?: DeviceType;

  /**
   * Whether the device supports hover interactions.
   * @default true for desktop, false for mobile/tablet
   */
  hover?: boolean;

  /**
   * Whether the device supports touch interactions.
   * @default false for desktop, true for mobile/tablet
   */
  touch?: boolean;

  /**
   * Safe area inset from the top of the screen (in pixels).
   * Used for devices with notches or status bars.
   */
  safeAreaTop?: number;

  /**
   * Safe area inset from the bottom of the screen (in pixels).
   * Used for devices with home indicators.
   */
  safeAreaBottom?: number;

  /**
   * Safe area inset from the left of the screen (in pixels).
   */
  safeAreaLeft?: number;

  /**
   * Safe area inset from the right of the screen (in pixels).
   */
  safeAreaRight?: number;
}

/**
 * Creates a URL path with query parameters for the ChatGPT Simulator.
 *
 * @param params - The simulator parameters to encode
 * @param basePath - The base path for the URL (default: '/')
 * @returns A URL path string with encoded query parameters
 *
 * @example
 * ```ts
 * // Basic usage
 * createSimulatorUrl({ simulation: 'albums-show', theme: 'light' })
 * // Returns: '/?simulation=albums-show&theme=light'
 *
 * // With display mode
 * createSimulatorUrl({
 *   simulation: 'review-diff',
 *   theme: 'dark',
 *   displayMode: 'fullscreen',
 * })
 * // Returns: '/?simulation=review-diff&theme=dark&displayMode=fullscreen'
 *
 * // With device simulation
 * createSimulatorUrl({
 *   simulation: 'map-show',
 *   deviceType: 'mobile',
 *   touch: true,
 *   hover: false,
 * })
 * // Returns: '/?simulation=map-show&deviceType=mobile&touch=true&hover=false'
 *
 * // With safe area insets (for notch simulation)
 * createSimulatorUrl({
 *   simulation: 'carousel-show',
 *   safeAreaTop: 44,
 *   safeAreaBottom: 34,
 * })
 * // Returns: '/?simulation=carousel-show&safeAreaTop=44&safeAreaBottom=34'
 * ```
 */
export function createSimulatorUrl(params: SimulatorUrlParams, basePath = '/'): string {
  const searchParams = new URLSearchParams();

  // Add each defined parameter
  if (params.simulation !== undefined) {
    searchParams.set('simulation', params.simulation);
  }
  if (params.theme !== undefined) {
    searchParams.set('theme', params.theme);
  }
  if (params.displayMode !== undefined) {
    searchParams.set('displayMode', params.displayMode);
  }
  if (params.locale !== undefined) {
    searchParams.set('locale', params.locale);
  }
  if (params.maxHeight !== undefined) {
    searchParams.set('maxHeight', String(params.maxHeight));
  }
  if (params.deviceType !== undefined) {
    searchParams.set('deviceType', params.deviceType);
  }
  if (params.hover !== undefined) {
    searchParams.set('hover', String(params.hover));
  }
  if (params.touch !== undefined) {
    searchParams.set('touch', String(params.touch));
  }
  if (params.safeAreaTop !== undefined) {
    searchParams.set('safeAreaTop', String(params.safeAreaTop));
  }
  if (params.safeAreaBottom !== undefined) {
    searchParams.set('safeAreaBottom', String(params.safeAreaBottom));
  }
  if (params.safeAreaLeft !== undefined) {
    searchParams.set('safeAreaLeft', String(params.safeAreaLeft));
  }
  if (params.safeAreaRight !== undefined) {
    searchParams.set('safeAreaRight', String(params.safeAreaRight));
  }
  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
