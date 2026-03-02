import { z } from 'zod';
import type { AppToolConfig, ToolHandlerExtra } from 'sunpeak/mcp';

export const tool: AppToolConfig = {
  resource: 'review',
  title: 'Review Purchase',
  description: 'Review a purchase before completing the transaction',
  annotations: { readOnlyHint: false },
  _meta: {
    ui: { visibility: ['model', 'app'] },
  },
};

export const schema = {
  cartId: z.string().describe('Shopping cart identifier'),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number(),
      })
    )
    .describe('List of items to purchase'),
  shippingAddressId: z.string().describe('ID of the saved shipping address'),
  shippingMethod: z.enum(['standard', 'express', 'overnight']).describe('Shipping speed'),
  paymentMethodId: z.string().describe('ID of the saved payment method'),
};

export default async function (_args: Record<string, unknown>, _extra: ToolHandlerExtra) {
  return { structuredContent: { title: 'Confirm Your Order', sections: [] } };
}
