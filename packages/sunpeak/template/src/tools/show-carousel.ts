import { z } from 'zod';
import type { AppToolConfig, ToolHandlerExtra } from 'sunpeak/mcp';

export const tool: AppToolConfig = {
  resource: 'carousel',
  title: 'Show Carousel',
  description: 'Show popular places to visit',
  annotations: { readOnlyHint: true },
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

export default async function (_args: Record<string, unknown>, _extra: ToolHandlerExtra) {
  return { structuredContent: { places: [] } };
}
