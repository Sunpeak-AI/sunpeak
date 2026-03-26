import {
  createInspectorUrl as _createInspectorUrl,
  type InspectorUrlParams,
} from 'sunpeak/chatgpt';

/**
 * Wrapper around createInspectorUrl that hides the dev overlay by default.
 * The overlay shows resource timestamps and tool timing, which can interfere
 * with element assertions in e2e tests.
 */
export function createInspectorUrl(params: InspectorUrlParams, basePath?: string): string {
  return _createInspectorUrl({ devOverlay: false, ...params }, basePath);
}
