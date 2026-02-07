import { useCallback } from 'react';
import { useApp } from '../../hooks/use-app';
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
 * import { useRequestModal } from 'sunpeak/platform/chatgpt';
 *
 * function CheckoutButton() {
 *   const requestModal = useRequestModal();
 *
 *   return (
 *     <button onClick={() => requestModal({ template: 'ui://widget/checkout.html' })}>
 *       Checkout
 *     </button>
 *   );
 * }
 * ```
 */
export function useRequestModal(): (params: OpenAIRequestModalParams) => Promise<void> {
  const app = useApp();
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
