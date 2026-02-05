import { useHostContext } from './use-host-context';
import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';

type SafeAreaInsets = NonNullable<McpUiHostContext['safeAreaInsets']>;

const DEFAULT_INSETS: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };

export function useSafeArea(app: App | null): SafeAreaInsets {
  const context = useHostContext(app);
  return context?.safeAreaInsets ?? DEFAULT_INSETS;
}
