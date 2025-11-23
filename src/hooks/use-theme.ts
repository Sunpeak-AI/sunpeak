import { useWidgetGlobal } from './use-widget-global';
import type { Theme } from '../types';

export const useTheme = (): Theme | null => {
  return useWidgetGlobal('theme');
};
