import type { IncomingMessage } from 'node:http';
import type { AuthInfo } from 'sunpeak/mcp';

/**
 * Optional server entry point.
 *
 * The `auth` function extracts authentication info from incoming HTTP requests.
 * The returned `AuthInfo` is available as `extra.authInfo` in tool handlers.
 */
export function auth(req: IncomingMessage): AuthInfo {
  const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
  return { token, clientId: 'my-app', scopes: [] };
}

export const server = { name: 'Sunpeak', version: '1.0.0' };
