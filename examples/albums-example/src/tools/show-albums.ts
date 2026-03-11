import { z } from 'zod';
import type { AppToolConfig, ToolHandlerExtra } from 'sunpeak/mcp';

export const tool: AppToolConfig = {
  resource: 'albums',
  title: 'Show Albums',
  description: 'Show photo albums',
  annotations: { readOnlyHint: true },
  _meta: {
    ui: { visibility: ['model', 'app'] },
  },
};

export const schema = {
  category: z.string().describe('Filter albums by category (e.g., travel, food, family)'),
  search: z.string().describe('Search term to filter albums by title or description'),
  limit: z.number().describe('Maximum number of albums to return'),
};

type Args = z.infer<z.ZodObject<typeof schema>>;

export default async function (args: Args, _extra: ToolHandlerExtra) {
  const title = args.category
    ? `${args.category.charAt(0).toUpperCase() + args.category.slice(1)} Photos`
    : args.search
      ? `"${args.search}" Results`
      : 'My Albums';

  return {
    structuredContent: {
      albums: [
        {
          id: '1',
          title,
          cover: 'https://cdn.sunpeak.ai/demo/pizza1.jpeg',
          photos: [
            { id: 'p1', title: 'Photo 1', url: 'https://cdn.sunpeak.ai/demo/pizza1.jpeg' },
            { id: 'p2', title: 'Photo 2', url: 'https://cdn.sunpeak.ai/demo/pizza2.jpeg' },
          ],
        },
      ],
    },
  };
}
