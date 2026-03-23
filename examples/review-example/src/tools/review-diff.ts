import { z } from 'zod';
import type { AppToolConfig, ToolHandlerExtra } from 'sunpeak/mcp';

export const tool: AppToolConfig = {
  resource: 'review',
  title: 'Diff Review',
  description: 'Show a review dialog for a proposed code diff',
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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

type Args = z.infer<z.ZodObject<typeof schema>>;

export default async function (args: Args, _extra: ToolHandlerExtra) {
  const files = args.files ?? ['src/app.tsx', 'src/utils/helpers.ts'];
  const changes: Array<{ id: string; type: string; path?: string; description: string }> =
    files.map((file, i) => ({
      id: String(i + 1),
      type: 'modify',
      path: file,
      description: `Changes to ${file.split('/').pop()}`,
    }));

  if (args.runMigrations) {
    changes.push({
      id: 'migration',
      type: 'action',
      description: 'Run database migrations',
    });
  }

  return {
    structuredContent: {
      title: args.title || 'Code Review',
      description: args.description || 'Review the proposed changes below',
      sections: [{ type: 'changes', title: 'File Changes', content: changes }],
      reviewTool: {
        name: 'review',
        arguments: { action: 'apply_changes', changesetId: args.changesetId || 'cs-1' },
      },
    },
  };
}
