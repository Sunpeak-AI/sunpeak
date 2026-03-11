import { z } from 'zod';
import type { AppToolConfig, ToolHandlerExtra } from 'sunpeak/mcp';

export const tool: AppToolConfig = {
  resource: 'map',
  title: 'Show Map',
  description: 'Show the map',
  annotations: { readOnlyHint: true },
  _meta: {
    ui: { visibility: ['model', 'app'] },
  },
};

export const schema = {
  query: z.string().describe('Search query for places (e.g., pizza, coffee, restaurants)'),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .describe('Center location for the search'),
  radius: z.number().describe('Search radius in miles'),
  minRating: z.number().describe('Minimum rating filter (1-5)'),
  priceRange: z.array(z.enum(['$', '$$', '$$$', '$$$$'])).describe('Price range filter'),
};

type Args = z.infer<z.ZodObject<typeof schema>>;

export default async function (args: Args, _extra: ToolHandlerExtra) {
  const lat = args.location?.lat ?? 37.8001;
  const lng = args.location?.lng ?? -122.4098;
  const query = args.query || 'pizza';

  return {
    structuredContent: {
      places: [
        {
          id: '1',
          name: `${query.charAt(0).toUpperCase() + query.slice(1)} Place`,
          coords: [lng, lat] as [number, number],
          description: `A great ${query} spot nearby`,
          city: 'San Francisco',
          rating: args.minRating ?? 4.5,
          price: args.priceRange?.[0] ?? '$$',
          thumbnail: 'https://cdn.sunpeak.ai/demo/pizza1.jpeg',
        },
      ],
    },
  };
}
