import { useCallback } from 'react';
import { useApp } from './use-app';

/**
 * Parameters for opening a link.
 */
export interface OpenLinkParams {
  /** URL to open */
  url: string;
}

/**
 * Hook to open external links through the host.
 *
 * Opens a URL in a new tab/window through the host's link handling mechanism.
 * This is preferred over `window.open()` as it respects the host's security policies.
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const openLink = useOpenLink();
 *
 *   return (
 *     <button onClick={() => openLink({ url: 'https://example.com' })}>
 *       Visit Website
 *     </button>
 *   );
 * }
 * ```
 */
export function useOpenLink(): (params: OpenLinkParams) => Promise<void> {
  const app = useApp();
  return useCallback(
    async (params: OpenLinkParams) => {
      if (!app) {
        console.warn('[useOpenLink] App not connected');
        return;
      }
      await app.openLink(params);
    },
    [app]
  );
}
