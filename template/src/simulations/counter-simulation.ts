/**
 * Server-safe configuration for the counter simulation.
 * This file contains only metadata and doesn't import React components or CSS.
 */

import { counterResourceMeta } from '../resources/counter-resource.meta';

export const counterSimulation = {
  userMessage: 'Help me count something',

  // MCP Tool protocol - official Tool type from MCP SDK used in ListTools response
  tool: {
    name: 'show-counter',
    description: 'Show a simple counter tool',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false } as const,
    title: 'Show Counter',
    annotations: { readOnlyHint: true },
    _meta: {
      'openai/outputTemplate': 'ui://CounterResource',
      'openai/toolInvocation/invoking': 'Counting beans',
      'openai/toolInvocation/invoked': 'Beans counted',
      'openai/widgetAccessible': true,
      'openai/resultCanProduceWidget': true,
    },
  },

  // MCP Resource protocol - imported from resource meta file
  resource: counterResourceMeta,

  // MCP CallTool protocol - data for CallTool response
  toolCall: {
    structuredContent: null,
    _meta: {},
  },
} as const;
