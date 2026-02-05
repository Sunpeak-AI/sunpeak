import { useHostContext } from './use-host-context';
import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';

type ContainerDimensions = NonNullable<McpUiHostContext['containerDimensions']>;

export function useViewport(app: App | null): ContainerDimensions | null {
  const context = useHostContext(app);
  return context?.containerDimensions ?? null;
}
