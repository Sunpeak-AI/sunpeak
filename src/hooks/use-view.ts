import { useWidgetGlobal } from './use-widget-global';
import type { View } from '../types';

export function useView(): View | null {
  return useWidgetGlobal('view');
}
