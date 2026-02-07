import { useHostContext } from './use-host-context';
import type { McpUiTheme } from '@modelcontextprotocol/ext-apps';

export function useTheme(): McpUiTheme {
  const context = useHostContext();
  return context?.theme ?? 'light';
}
