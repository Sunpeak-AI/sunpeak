import { z } from 'zod';
import type { AppToolConfig, ToolHandlerExtra } from 'sunpeak/mcp';

export const tool: AppToolConfig = {
  resource: 'review',
  title: 'Diff Review',
  description: 'Show a review dialog for a proposed code diff',
  annotations: { readOnlyHint: false },
  _meta: {
    ui: { visibility: ['model', 'app'] },
  },
};

export const schema = {
  changesetId: z.string().describe('Unique identifier for the changeset'),
  title: z.string().describe('Title describing the changes'),
  description: z.string().describe('Detailed description of what the changes accomplish'),
  files: z.array(z.string()).describe('List of file paths affected by this change'),
  runMigrations: z.boolean().describe('Whether to run database migrations as part of the change'),
};

export default async function (_args: Record<string, unknown>, _extra: ToolHandlerExtra) {
  return { structuredContent: { title: 'Review', sections: [] } };
}
