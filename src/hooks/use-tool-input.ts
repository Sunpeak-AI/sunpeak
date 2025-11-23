import { useWidgetGlobal } from './use-widget-global';
import type { UnknownObject } from '../types';

export function useToolInput<T extends UnknownObject = UnknownObject>(): T | null {
  return useWidgetGlobal('toolInput') as T | null;
}
