import { describe, it, expect } from 'vitest';
import handler, { tool, schema } from './show-map';

const extra = {} as Parameters<typeof handler>[1];

describe('show-map tool', () => {
  it('exports correct tool config', () => {
    expect(tool.resource).toBe('map');
    expect(tool.title).toBe('Show Map');
    expect(tool.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
  });

  it('has expected schema fields', () => {
    expect(schema.query).toBeDefined();
    expect(schema.location).toBeDefined();
    expect(schema.radius).toBeDefined();
    expect(schema.minRating).toBeDefined();
    expect(schema.priceRange).toBeDefined();
  });

  it('returns places with default query', async () => {
    const result = await handler(
      { query: '', location: { lat: 0, lng: 0 }, radius: 5, minRating: 4, priceRange: [] },
      extra
    );
    expect(result.structuredContent.places).toHaveLength(1);
    expect(result.structuredContent.places[0].name).toContain('Pizza');
  });

  it('uses provided query and location', async () => {
    const result = await handler(
      {
        query: 'coffee',
        location: { lat: 40.7, lng: -74.0 },
        radius: 3,
        minRating: 4,
        priceRange: ['$$'],
      },
      extra
    );
    const place = result.structuredContent.places[0];
    expect(place.name).toBe('Coffee Place');
    expect(place.coords).toEqual([-74.0, 40.7]);
    expect(place.price).toBe('$$');
  });

  it('uses default coordinates when no location', async () => {
    const result = await handler(
      { query: 'tacos', location: undefined as never, radius: 5, minRating: 3, priceRange: [] },
      extra
    );
    const place = result.structuredContent.places[0];
    expect(place.coords[0]).toBeCloseTo(-122.4098);
    expect(place.coords[1]).toBeCloseTo(37.8001);
  });

  it('returns place with expected fields', async () => {
    const result = await handler(
      {
        query: 'sushi',
        location: { lat: 35, lng: 139 },
        radius: 1,
        minRating: 4.5,
        priceRange: ['$$$'],
      },
      extra
    );
    const place = result.structuredContent.places[0];
    expect(place.id).toBeDefined();
    expect(place.city).toBe('San Francisco');
    expect(place.rating).toBe(4.5);
    expect(place.thumbnail).toBeTruthy();
  });
});
