import { z } from 'zod';
import type { AppToolConfig } from 'sunpeak/mcp';

export const tool: AppToolConfig = {
  resource: 'host-inspector',
  title: 'Inspect Host',
  description: 'Show detailed information about the host runtime environment',
  annotations: {
    readOnlyHint: true,
  },
};

export const schema = {
  label: z.string().optional().describe('Optional label for this inspection session'),
};

export default async function ({ label }: { label?: string }) {
  return {
    structuredContent: {
      label: label ?? 'Host Inspector',
      timestamp: new Date().toISOString(),
    },
  };
}
