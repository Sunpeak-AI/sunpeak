import { describe, it, expect } from 'vitest';
import handler, { tool, schema } from './review';

const extra = {} as Parameters<typeof handler>[1];

describe('review (confirm) tool', () => {
  it('exports correct tool config', () => {
    expect(tool.title).toBe('Confirm Review');
    expect(tool.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    });
    // No resource — this is a server-side-only tool
    expect((tool as { resource?: string }).resource).toBeUndefined();
  });

  it('has expected schema fields', () => {
    expect(schema.action).toBeDefined();
    expect(schema.confirmed).toBeDefined();
    expect(schema.decidedAt).toBeDefined();
    expect(schema.payload).toBeDefined();
  });

  it('returns cancelled status when not confirmed', async () => {
    const result = await handler(
      { action: 'apply_changes', confirmed: false, decidedAt: new Date().toISOString() },
      extra
    );
    expect(result.structuredContent.status).toBe('cancelled');
    expect(result.structuredContent.message).toBe('Cancelled.');
    expect(result.content[0].text).toBe('Cancelled.');
  });

  it('returns success status when confirmed', async () => {
    const result = await handler(
      { action: 'place_order', confirmed: true, decidedAt: new Date().toISOString() },
      extra
    );
    expect(result.structuredContent.status).toBe('success');
    expect(result.structuredContent.message).toBe('Completed.');
    expect(result.content[0].text).toBe('Completed.');
  });
});
