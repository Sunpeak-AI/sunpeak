import { useHostContext } from './use-host-context';

export function useLocale(): string {
  const context = useHostContext();
  return context?.locale ?? 'en-US';
}
