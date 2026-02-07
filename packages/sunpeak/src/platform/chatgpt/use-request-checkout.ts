import { useCallback } from 'react';
import { useApp } from '../../hooks/use-app';
import {
  getOpenAIRuntime,
  type OpenAICheckoutSession,
  type OpenAICheckoutOrder,
} from './openai-types';

export type { OpenAICheckoutSession as CheckoutSession };
export type { OpenAICheckoutOrder as CheckoutOrder };

/**
 * Trigger the ChatGPT instant checkout flow.
 *
 * Wraps `window.openai.requestCheckout` which is only available inside
 * ChatGPT. Opens the host checkout UI, handles payment display, and
 * resolves with the finalized order. Rejects on error or user cancel.
 *
 * Import from `sunpeak/platform/chatgpt`:
 *
 * @example
 * ```tsx
 * import { useRequestCheckout } from 'sunpeak/platform/chatgpt';
 *
 * function BuyButton() {
 *   const requestCheckout = useRequestCheckout();
 *
 *   const handleBuy = async () => {
 *     try {
 *       const order = await requestCheckout({
 *         id: 'session-1',
 *         payment_provider: {
 *           provider: 'stripe',
 *           merchant_id: 'acct_xxx',
 *           supported_payment_methods: ['card', 'apple_pay'],
 *         },
 *         status: 'ready_for_payment',
 *         currency: 'USD',
 *         totals: [{ type: 'total', display_text: 'Total', amount: 999 }],
 *         links: [],
 *         payment_mode: 'live',
 *       });
 *       console.log('Order completed:', order.id);
 *     } catch {
 *       console.log('Checkout cancelled or failed');
 *     }
 *   };
 *
 *   return <button onClick={handleBuy}>Buy Now</button>;
 * }
 * ```
 */
export function useRequestCheckout(): (
  session: OpenAICheckoutSession
) => Promise<OpenAICheckoutOrder> {
  const app = useApp();
  return useCallback(
    async (session: OpenAICheckoutSession) => {
      if (!app) {
        throw new Error('[useRequestCheckout] App not connected');
      }
      const runtime = getOpenAIRuntime();
      if (!runtime?.requestCheckout) {
        throw new Error('[useRequestCheckout] window.openai.requestCheckout not available');
      }
      return runtime.requestCheckout(session);
    },
    [app]
  );
}
