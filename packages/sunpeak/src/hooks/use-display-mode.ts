import { useHostContext } from './use-host-context';
import type { McpUiDisplayMode } from '@modelcontextprotocol/ext-apps';

export function useDisplayMode(): McpUiDisplayMode {
  const context = useHostContext();
  return context?.displayMode ?? 'inline';
}
