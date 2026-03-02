import { z } from 'zod';
import type { AppToolConfig, ToolHandlerExtra } from 'sunpeak/mcp';

export const tool: AppToolConfig = {
  resource: 'review',
  title: 'Review Post',
  description: 'Review a social media post before publishing',
  annotations: { readOnlyHint: false },
  _meta: {
    ui: { visibility: ['model', 'app'] },
  },
};

export const schema = {
  content: z.string().describe('The text content of the post'),
  platforms: z
    .array(z.enum(['x', 'linkedin', 'facebook', 'instagram']))
    .describe('Social media platforms to post to'),
  schedule: z.enum(['now', 'scheduled']).describe('When to publish the post'),
  scheduledTime: z.string().describe('ISO 8601 timestamp for scheduled posts'),
  visibility: z.enum(['public', 'connections', 'private']).describe('Post visibility setting'),
};

export default async function (_args: Record<string, unknown>, _extra: ToolHandlerExtra) {
  return { structuredContent: { title: 'Review Your Post', sections: [] } };
}
