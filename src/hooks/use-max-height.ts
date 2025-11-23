import { useWidgetGlobal } from './use-widget-global';

export const useMaxHeight = (): number | null => {
  return useWidgetGlobal('maxHeight');
};
