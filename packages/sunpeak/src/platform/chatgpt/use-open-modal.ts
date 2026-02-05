import { useCallback } from 'react';
import type { App } from '@modelcontextprotocol/ext-apps';
import { getOpenAIRuntime, type OpenAIRequestModalParams } from './openai-types';

export type { OpenAIRequestModalParams as OpenModalParams };

/**
 * Open a host-controlled modal in ChatGPT.
 *
 * Wraps `window.openai.requestModal` which is only available inside ChatGPT.
 * Pass a `template` URL to load alternate UI content in the modal, or omit
 * it to reuse the current UI.
 *
 * Import from `sunpeak/platform/chatgpt`:
 *
 * @example
 * ```tsx
 * import { useApp } from 'sunpeak';
 * import { useRequestModal } from 'sunpeak/platform/chatgpt';
 *
 * function CheckoutButton() {
 *   const { app } = useApp({ appInfo, capabilities });
 *   const requestModal = useRequestModal(app);
 *
 *   return (
 *     <button onClick={() => requestModal({ template: 'ui://widget/checkout.html' })}>
 *       Checkout
 *     </button>
 *   );
 * }
 * ```
 *
 * @param app - The MCP App instance (from useApp).
 */
export function useRequestModal(
  app: App | null
): (params: OpenAIRequestModalParams) => Promise<void> {
  return useCallback(
    async (params: OpenAIRequestModalParams) => {
      if (!app) {
        console.warn('[useRequestModal] App not connected');
        return;
      }
      const runtime = getOpenAIRuntime();
      if (!runtime?.requestModal) {
        throw new Error('[useRequestModal] window.openai.requestModal not available');
      }
      return runtime.requestModal(params);
    },
    [app]
  );
}
