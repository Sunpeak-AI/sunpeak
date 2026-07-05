import { DisplayMode, Theme } from '../types/runtime';

export type ScreenWidth =
  'mobile-s' | 'mobile-m' | 'mobile-l' | 'mobile-xl' | 'tablet' | 'tablet-l' | 'full';

export type InspectorConfig = {
  theme: Theme;
  displayMode: DisplayMode;
  screenWidth: ScreenWidth;
};

export const SCREEN_WIDTHS: Record<ScreenWidth, number> = {
  'mobile-s': 375,
  'mobile-m': 393,
  'mobile-l': 425,
  'mobile-xl': 430,
  tablet: 768,
  'tablet-l': 820,
  full: 1024,
};
