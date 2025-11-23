import { DisplayMode, Theme } from './openai-types';

export type ScreenWidth = 'mobile-s' | 'mobile-l' | 'tablet' | 'full';

export type SimulatorConfig = {
  theme: Theme;
  displayMode: DisplayMode;
  screenWidth: ScreenWidth;
};

export const SCREEN_WIDTHS: Record<ScreenWidth, number> = {
  'mobile-s': 375,
  'mobile-l': 425,
  tablet: 768,
  full: 1024,
};
