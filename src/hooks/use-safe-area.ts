import { useWidgetGlobal } from './use-widget-global';
import type { SafeArea } from '../types';

export const useSafeArea = (): SafeArea | null => {
  return useWidgetGlobal('safeArea');
};
