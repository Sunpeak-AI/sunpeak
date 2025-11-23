import { useWidgetGlobal } from './use-widget-global';

export const useLocale = (): string | null => {
  return useWidgetGlobal('locale');
};
