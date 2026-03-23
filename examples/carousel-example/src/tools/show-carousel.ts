import { z } from 'zod';
import type { AppToolConfig, ToolHandlerExtra } from 'sunpeak/mcp';

export const tool: AppToolConfig = {
  resource: 'carousel',
  title: 'Show Carousel',
  description: 'Show popular places to visit',
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  _meta: {
    ui: { visibility: ['model', 'app'] },
  },
};

export const schema = {
  city: z.string().describe('City name to search for places'),
  state: z.string().describe('State or region'),
  categories: z
    .array(z.string())
    .describe('Filter by categories (e.g., parks, restaurants, landmarks)'),
  limit: z.number().describe('Maximum number of places to return'),
};

type Args = z.infer<z.ZodObject<typeof schema>>;

export default async function (args: Args, _extra: ToolHandlerExtra) {
  const city = args.city || 'Austin';
  const category = args.categories?.[0] || 'landmark';

  return {
    structuredContent: {
      places: [
        {
          id: '1',
          name: `${city} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
          rating: 4.7,
          category,
          location: `${city}${args.state ? `, ${args.state}` : ''}`,
          image: 'https://cdn.sunpeak.ai/demo/austin1.jpeg',
          description: `A popular ${category} in ${city}`,
        },
      ],
    },
  };
}
