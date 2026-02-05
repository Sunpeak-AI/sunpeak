import { useHostContext } from './use-host-context';
import type { App } from '@modelcontextprotocol/ext-apps';

export function useLocale(app: App | null): string {
  const context = useHostContext(app);
  return context?.locale ?? 'en-US';
}
