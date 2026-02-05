import { useHostContext } from './use-host-context';
import type { App, McpUiDisplayMode } from '@modelcontextprotocol/ext-apps';

export function useDisplayMode(app: App | null): McpUiDisplayMode {
  const context = useHostContext(app);
  return context?.displayMode ?? 'inline';
}
