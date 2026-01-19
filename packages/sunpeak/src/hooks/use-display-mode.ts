import { useWidgetGlobal } from './use-widget-global';
import type { DisplayMode } from '../types';

export const useDisplayMode = (): DisplayMode | null => {
  return useWidgetGlobal('displayMode');
};
