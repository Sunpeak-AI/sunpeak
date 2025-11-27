import type { ToolConfig } from './types';

/**
 * Server-safe configuration for the counter simulation.
 * This file contains only metadata and doesn't import React components or CSS.
 */
export const counterSimulationConfig: ToolConfig = {
  value: 'counter',
  label: 'Counter',
  userMessage: 'Help me count something',
  mcpToolOutput: null,
  mcpToolListMetadata: {
    'openai/outputTemplate': 'ui://widget/counter.html',
    'openai/toolInvocation/invoking': 'Counting beans',
    'openai/toolInvocation/invoked': 'Beans counted',
    'openai/widgetAccessible': true,
    'openai/resultCanProduceWidget': true,
  },
  mcpToolCallMetadata: {},
  mcpResourceURI: 'ui://widget/counter.html',
  toolDescription: 'Show a simple counter tool',
};
