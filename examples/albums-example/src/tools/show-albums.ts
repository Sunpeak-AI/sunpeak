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

export default async function (_args: Record<string, unknown>, _extra: ToolHandlerExtra) {
  return { structuredContent: { albums: [] } };
}
