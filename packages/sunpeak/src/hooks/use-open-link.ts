import { useCallback } from 'react';
import type { App } from '@modelcontextprotocol/ext-apps';

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
 * @param app - The MCP App instance (from useApp).
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const { app } = useApp({ appInfo, capabilities });
 *   const openLink = useOpenLink(app);
 *
 *   return (
 *     <button onClick={() => openLink({ url: 'https://example.com' })}>
 *       Visit Website
 *     </button>
 *   );
 * }
 * ```
 */
export function useOpenLink(app: App | null): (params: OpenLinkParams) => Promise<void> {
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
