import { describe, it, expect } from 'vitest';
import handler, { tool, schema } from './show-albums';

const extra = {} as Parameters<typeof handler>[1];

describe('show-albums tool', () => {
  it('exports correct tool config', () => {
    expect(tool.resource).toBe('albums');
    expect(tool.title).toBe('Show Albums');
    expect(tool.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
  });

  it('has expected schema fields', () => {
    expect(schema.category).toBeDefined();
    expect(schema.search).toBeDefined();
    expect(schema.limit).toBeDefined();
  });

  it('returns albums with default title when no filters', async () => {
    const result = await handler({ category: '', search: '', limit: 10 }, extra);
    expect(result.structuredContent.albums).toHaveLength(1);
    expect(result.structuredContent.albums[0].title).toBe('My Albums');
  });

  it('uses category in title when provided', async () => {
    const result = await handler({ category: 'travel', search: '', limit: 5 }, extra);
    expect(result.structuredContent.albums[0].title).toBe('Travel Photos');
  });

  it('uses search term in title when provided', async () => {
    const result = await handler({ category: '', search: 'sunset', limit: 5 }, extra);
    expect(result.structuredContent.albums[0].title).toBe('"sunset" Results');
  });

  it('returns albums with photos', async () => {
    const result = await handler({ category: '', search: '', limit: 10 }, extra);
    const album = result.structuredContent.albums[0];
    expect(album.id).toBe('1');
    expect(album.cover).toBeTruthy();
    expect(album.photos.length).toBeGreaterThan(0);
  });
});
