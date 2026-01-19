import { useWidgetGlobal } from './use-widget-global';
import type { UserAgent } from '../types';

export const useUserAgent = (): UserAgent | null => {
  return useWidgetGlobal('userAgent');
};
