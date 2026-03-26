import type { Theme, DisplayMode, DeviceType } from '../types/runtime';

/**
 * Strongly-typed URL parameters for the Inspector.
 *
 * Use with `createInspectorUrl()` to generate type-safe URL paths for e2e tests.
 *
 * The two primary selectors mirror the sidebar dropdowns:
 * - `tool` — which tool to inspect (Tool dropdown)
 * - `simulation` — which simulation fixture to load (Simulation dropdown)
 *
 * When only `tool` is specified, no mock data is loaded ("Press Run" state).
 * When `simulation` is specified, mock data from that fixture renders immediately.
 * When both are specified, the tool is selected and the simulation provides mock data.
 *
 * @example
 * ```ts
 * import { createInspectorUrl } from 'sunpeak/inspector';
 *
 * // Select a tool with no mock data (user must click Run):
 * await page.goto(createInspectorUrl({ tool: 'show-albums' }));
 *
 * // Select a simulation (mock data renders immediately):
 * await page.goto(createInspectorUrl({ simulation: 'show-albums' }));
 *
 * // Full options:
 * await page.goto(createInspectorUrl({
 *   simulation: 'show-albums',
 *   theme: 'dark',
 *   host: 'claude',
 * }));
 * ```
 */
export interface InspectorUrlParams {
  /**
   * The simulation name to load (e.g., 'show-albums', 'review-diff').
   * Corresponds to the simulation JSON filename without the `.json` extension.
   * When specified, mock data from the simulation fixture renders immediately.
   */
  simulation?: string;

  /**
   * The tool name to select (e.g., 'show-albums', 'show-map').
   * When specified without `simulation`, no mock data is loaded — the user
   * must click Run to call the real handler.
   */
  tool?: string;

  /**
   * The host shell to use (e.g., 'chatgpt', 'claude').
   * Switches conversation chrome, theming, and reported host info/capabilities.
   * @default 'chatgpt'
   */
  host?: string;

  /**
   * The color theme for the inspector.
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
   * The locale for the inspector (e.g., 'en-US', 'ja-JP').
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

  /**
   * Enable Prod Resources mode (production dist/ bundles instead of HMR).
   */
  prodResources?: boolean;

  /**
   * Show the inspector sidebar. Useful for headless testing or embedding
   * the inspector as a pure resource viewer.
   * @default true
   */
  sidebar?: boolean;

  /**
   * Show the dev overlay (resource timestamp + tool timing) inside resources.
   * Set to false to hide it during e2e tests so it doesn't interfere with
   * element assertions.
   * @default true
   */
  devOverlay?: boolean;
}

/**
 * Creates a URL path with query parameters for the Inspector.
 *
 * @param params - The inspector parameters to encode
 * @param basePath - The base path for the URL (default: '/')
 * @returns A URL path string with encoded query parameters
 *
 * @example
 * ```ts
 * // Tool only (no mock data, "Press Run" state):
 * createInspectorUrl({ tool: 'show-albums' })
 * // Returns: '/?tool=show-albums'
 *
 * // Simulation (mock data renders immediately):
 * createInspectorUrl({ simulation: 'show-albums', theme: 'light' })
 * // Returns: '/?simulation=show-albums&theme=light'
 *
 * // Both tool and simulation:
 * createInspectorUrl({ tool: 'show-albums', simulation: 'show-albums' })
 * // Returns: '/?tool=show-albums&simulation=show-albums'
 * ```
 */
export function createInspectorUrl(params: InspectorUrlParams, basePath = '/'): string {
  const searchParams = new URLSearchParams();

  if (params.tool !== undefined) {
    searchParams.set('tool', params.tool);
  }
  if (params.simulation !== undefined) {
    searchParams.set('simulation', params.simulation);
  }
  if (params.host !== undefined) {
    searchParams.set('host', params.host);
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
  if (params.prodResources !== undefined) {
    searchParams.set('prodResources', String(params.prodResources));
  }
  if (params.sidebar !== undefined) {
    searchParams.set('sidebar', String(params.sidebar));
  }
  if (params.devOverlay !== undefined) {
    searchParams.set('devOverlay', String(params.devOverlay));
  }

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
