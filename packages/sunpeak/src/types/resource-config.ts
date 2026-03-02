import type { Resource } from '@modelcontextprotocol/sdk/types.js';
import type { McpUiResourceMeta } from '@modelcontextprotocol/ext-apps';

/**
 * Configuration for an MCP App resource, exported from resource .tsx files.
 *
 * Composes the official MCP SDK `Resource` type (without `uri` and `name`,
 * which are derived from the directory name at discovery time).
 *
 * `name` is optional — when omitted, it's derived from the directory name
 * (e.g., `src/resources/albums/albums.tsx` → `'albums'`).
 */
export type ResourceConfig = Omit<Resource, 'uri' | 'name'> & {
  name?: string;
  title?: string;
  _meta?: {
    ui?: McpUiResourceMeta;
    [key: string]: unknown;
  };
};
