/**
 * Server-safe configuration for the counter simulation.
 * This file contains only metadata and doesn't import React components or CSS.
 */

import { defaultWidgetMeta } from './widget-config';

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

  // MCP Resource protocol - official Resource type from MCP SDK used in ListResources response
  // resource.name is used as the simulation identifier
  // resource.title is used as the simulation display label
  resource: {
    uri: 'ui://CounterResource',
    name: 'counter',
    title: 'Counter',
    description: 'Show a simple counter tool widget markup',
    mimeType: 'text/html+skybridge',
    _meta: {
      ...defaultWidgetMeta,
    },
  },

  // MCP CallTool protocol - data for CallTool response
  toolCall: {
    structuredContent: null,
    _meta: {},
  },
} as const;
