import { z } from 'zod';
import type { AppToolConfig, ToolHandlerExtra } from 'sunpeak/mcp';

export const tool: AppToolConfig = {
  resource: 'review',
  title: 'Review Purchase',
  description: 'Review a purchase before completing the transaction',
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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

type Args = z.infer<z.ZodObject<typeof schema>>;

export default async function (args: Args, _extra: ToolHandlerExtra) {
  const rawItems = args.items ?? [{ productId: 'DEMO-001', quantity: 1 }];
  const items = rawItems.map((item, i) => ({
    id: String(i + 1),
    title: `Item ${item.productId}`,
    subtitle: `Qty: ${item.quantity}`,
  }));

  const shippingLabels: Record<string, string> = {
    standard: 'Standard (5-7 days)',
    express: 'Express (2-3 days)',
    overnight: 'Overnight',
  };

  const shippingMethod = args.shippingMethod || 'standard';

  return {
    structuredContent: {
      title: 'Confirm Your Order',
      sections: [
        { type: 'items', title: 'Items', content: items },
        {
          type: 'details',
          title: 'Shipping',
          content: [{ label: 'Method', value: shippingLabels[shippingMethod] || shippingMethod }],
        },
      ],
      acceptLabel: 'Place Order',
      rejectLabel: 'Cancel',
      reviewTool: {
        name: 'review',
        arguments: { action: 'place_order', cartId: args.cartId || 'cart-1' },
      },
    },
  };
}
