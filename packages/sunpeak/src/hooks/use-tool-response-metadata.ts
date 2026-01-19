import { useWidgetGlobal } from './use-widget-global';
import type { UnknownObject } from '../types';

export function useToolResponseMetadata<T extends UnknownObject = UnknownObject>(): T | null {
  return useWidgetGlobal('toolResponseMetadata') as T | null;
}
