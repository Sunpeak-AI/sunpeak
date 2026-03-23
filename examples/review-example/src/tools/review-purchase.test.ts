import { describe, it, expect } from 'vitest';
import handler, { tool, schema } from './review-purchase';

const extra = {} as Parameters<typeof handler>[1];

describe('review-purchase tool', () => {
  it('exports correct tool config', () => {
    expect(tool.resource).toBe('review');
    expect(tool.title).toBe('Review Purchase');
    expect(tool.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
  });

  it('has expected schema fields', () => {
    expect(schema.cartId).toBeDefined();
    expect(schema.items).toBeDefined();
    expect(schema.shippingMethod).toBeDefined();
    expect(schema.paymentMethodId).toBeDefined();
  });

  it('returns structured content with defaults', async () => {
    const result = await handler(
      {
        cartId: '',
        items: [],
        shippingAddressId: '',
        shippingMethod: 'standard',
        paymentMethodId: '',
      },
      extra
    );
    expect(result.structuredContent.title).toBe('Confirm Your Order');
    expect(result.structuredContent.acceptLabel).toBe('Place Order');
    expect(result.structuredContent.rejectLabel).toBe('Cancel');
  });

  it('maps items to display format', async () => {
    const result = await handler(
      {
        cartId: 'cart-1',
        items: [
          { productId: 'ABC-123', quantity: 2 },
          { productId: 'DEF-456', quantity: 1 },
        ],
        shippingAddressId: 'addr-1',
        shippingMethod: 'express',
        paymentMethodId: 'pm-1',
      },
      extra
    );
    const itemsSection = result.structuredContent.sections.find(
      (s: { type: string }) => s.type === 'items'
    );
    const items = itemsSection?.content as { id: string; title: string; subtitle: string }[];
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Item ABC-123');
    expect(items[0].subtitle).toBe('Qty: 2');
  });

  it('displays shipping method label', async () => {
    const result = await handler(
      {
        cartId: '',
        items: [],
        shippingAddressId: '',
        shippingMethod: 'overnight',
        paymentMethodId: '',
      },
      extra
    );
    const shippingSection = result.structuredContent.sections.find(
      (s: { type: string }) => s.type === 'details'
    );
    const method = (shippingSection?.content as { label: string; value: string }[])?.find(
      (d) => d.label === 'Method'
    );
    expect(method?.value).toBe('Overnight');
  });

  it('uses default items when none provided', async () => {
    const result = await handler(
      {
        cartId: '',
        items: undefined as never,
        shippingAddressId: '',
        shippingMethod: 'standard',
        paymentMethodId: '',
      },
      extra
    );
    const itemsSection = result.structuredContent.sections.find(
      (s: { type: string }) => s.type === 'items'
    );
    const items = itemsSection?.content as { id: string; title: string; subtitle: string }[];
    expect(items).toHaveLength(1);
    expect(items[0].title).toContain('DEMO-001');
  });

  it('passes cartId to reviewTool arguments', async () => {
    const result = await handler(
      {
        cartId: 'cart-42',
        items: [],
        shippingAddressId: '',
        shippingMethod: 'standard',
        paymentMethodId: '',
      },
      extra
    );
    expect(result.structuredContent.reviewTool.arguments.cartId).toBe('cart-42');
  });
});
