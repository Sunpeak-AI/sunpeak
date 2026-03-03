import type { IncomingMessage } from 'node:http';
import type { AuthInfo } from 'sunpeak/mcp';

/**
 * Optional server entry point.
 *
 * Called on every MCP request. Return AuthInfo to authenticate, null to reject (401).
 * The returned AuthInfo is available as `extra.authInfo` in tool handlers.
 */
export async function auth(req: IncomingMessage): Promise<AuthInfo | null> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  return { token, clientId: 'my-app', scopes: [] };
}

export const server = { name: 'Sunpeak', version: '1.0.0' };
