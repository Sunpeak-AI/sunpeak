import { useHostContext } from './use-host-context';
import type { App, McpUiTheme } from '@modelcontextprotocol/ext-apps';

export function useTheme(app: App | null): McpUiTheme {
  const context = useHostContext(app);
  return context?.theme ?? 'light';
}
