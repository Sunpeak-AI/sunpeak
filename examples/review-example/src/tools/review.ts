import { z } from 'zod';
import type { AppToolConfig, ToolHandlerExtra } from 'sunpeak/mcp';

export const tool: AppToolConfig = {
  title: 'Confirm Review',
  description: 'Execute or cancel a reviewed action after user approval in the review UI',
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  _meta: { ui: { visibility: ['model', 'app'] } },
};

export const schema = {
  action: z
    .string()
    .describe('Action identifier (e.g., "place_order", "apply_changes", "publish")'),
  confirmed: z.boolean().describe('Whether the user confirmed the action'),
  decidedAt: z.string().describe('ISO timestamp of the decision'),
  payload: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Domain-specific data for the action'),
};

type Args = z.infer<z.ZodObject<typeof schema>>;

export default async function (args: Args, _extra: ToolHandlerExtra) {
  if (!args.confirmed) {
    return {
      content: [{ type: 'text' as const, text: 'Cancelled.' }],
      structuredContent: { status: 'cancelled', message: 'Cancelled.' },
    };
  }

  // In production, dispatch to your domain logic based on args.action:
  // - "place_order"    → call payment API
  // - "apply_changes"  → apply code diff
  // - "publish"        → publish social post
  return {
    content: [{ type: 'text' as const, text: 'Completed.' }],
    structuredContent: { status: 'success', message: 'Completed.' },
  };
}
