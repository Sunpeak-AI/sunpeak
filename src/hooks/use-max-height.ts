import { useWidgetGlobal } from './use-widget-global';

export const useMaxHeight = (): number | null | undefined => {
  return useWidgetGlobal('maxHeight');
};
