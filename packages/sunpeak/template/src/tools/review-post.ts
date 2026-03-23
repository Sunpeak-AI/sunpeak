import { z } from 'zod';
import type { AppToolConfig, ToolHandlerExtra } from 'sunpeak/mcp';

export const tool: AppToolConfig = {
  resource: 'review',
  title: 'Review Post',
  description: 'Review a social media post before publishing',
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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

type Args = z.infer<z.ZodObject<typeof schema>>;

export default async function (args: Args, _extra: ToolHandlerExtra) {
  const platforms = args.platforms?.join(', ') || 'X, LinkedIn';
  const content = args.content || 'Check out our latest update!';

  return {
    structuredContent: {
      title: 'Review Your Post',
      sections: [
        { type: 'preview', title: 'Content', content },
        {
          type: 'details',
          title: 'Publishing Details',
          content: [
            { label: 'Platforms', value: platforms },
            {
              label: 'Schedule',
              value:
                args.schedule === 'scheduled' && args.scheduledTime
                  ? new Date(args.scheduledTime).toLocaleString()
                  : 'Immediately',
            },
            { label: 'Visibility', value: args.visibility || 'public' },
          ],
        },
      ],
      acceptLabel: 'Publish',
      rejectLabel: 'Cancel',
      reviewTool: { name: 'review', arguments: { action: 'publish' } },
    },
  };
}
