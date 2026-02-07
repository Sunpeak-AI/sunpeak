import { useHostContext } from './use-host-context';
import type { McpUiHostContext } from '@modelcontextprotocol/ext-apps';

type SafeAreaInsets = NonNullable<McpUiHostContext['safeAreaInsets']>;

const DEFAULT_INSETS: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };

export function useSafeArea(): SafeAreaInsets {
  const context = useHostContext();
  return context?.safeAreaInsets ?? DEFAULT_INSETS;
}
