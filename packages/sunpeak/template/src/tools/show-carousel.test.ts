import { describe, it, expect } from 'vitest';
import handler, { tool, schema } from './show-carousel';

const extra = {} as Parameters<typeof handler>[1];

describe('show-carousel tool', () => {
  it('exports correct tool config', () => {
    expect(tool.resource).toBe('carousel');
    expect(tool.title).toBe('Show Carousel');
    expect(tool.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
  });

  it('has expected schema fields', () => {
    expect(schema.city).toBeDefined();
    expect(schema.state).toBeDefined();
    expect(schema.categories).toBeDefined();
    expect(schema.limit).toBeDefined();
  });

  it('returns places with default city', async () => {
    const result = await handler({ city: '', state: '', categories: [], limit: 5 }, extra);
    expect(result.structuredContent.places).toHaveLength(1);
    expect(result.structuredContent.places[0].name).toContain('Austin');
  });

  it('uses provided city and category', async () => {
    const result = await handler(
      { city: 'Denver', state: 'CO', categories: ['parks'], limit: 5 },
      extra
    );
    const place = result.structuredContent.places[0];
    expect(place.name).toBe('Denver Parks');
    expect(place.location).toBe('Denver, CO');
    expect(place.category).toBe('parks');
  });

  it('returns place with expected fields', async () => {
    const result = await handler({ city: 'NYC', state: '', categories: [], limit: 5 }, extra);
    const place = result.structuredContent.places[0];
    expect(place.id).toBeDefined();
    expect(place.rating).toBeDefined();
    expect(place.image).toBeTruthy();
    expect(place.description).toBeTruthy();
  });
});
