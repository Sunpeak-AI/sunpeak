import { useHostContext } from './use-host-context';
import type { McpUiHostContext } from '@modelcontextprotocol/ext-apps';

type ContainerDimensions = NonNullable<McpUiHostContext['containerDimensions']>;

export type Viewport = ContainerDimensions & { maxHeight?: number };

export function useViewport(): Viewport | null {
  const context = useHostContext();
  return (context?.containerDimensions as Viewport | undefined) ?? null;
}
