import type { Resource } from '@modelcontextprotocol/sdk/types.js';
import type { McpUiResourceMeta } from '@modelcontextprotocol/ext-apps';

/**
 * Configuration for an MCP App resource, exported from resource .tsx files.
 *
 * Composes the official MCP SDK `Resource` type (without `uri`, which is
 * generated at build time) with ext-apps `McpUiResourceMeta` for typed
 * CSP and permissions configuration.
 */
export type ResourceConfig = Omit<Resource, 'uri'> & {
  name: string;
  title?: string;
  _meta?: {
    ui?: McpUiResourceMeta;
    [key: string]: unknown;
  };
};
