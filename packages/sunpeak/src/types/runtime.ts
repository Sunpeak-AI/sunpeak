/**
 * Generic runtime types for widget environments.
 * These types are provider-agnostic and can be used across different widget platforms.
 */

export type UnknownObject = Record<string, unknown>;

export type Theme = 'light' | 'dark';

export type SafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type SafeArea = {
  insets: SafeAreaInsets;
};

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export type UserAgent = {
  device: { type: DeviceType };
  capabilities: {
    hover: boolean;
    touch: boolean;
  };
};

export type DisplayMode = 'pip' | 'inline' | 'fullscreen';

export type ViewMode = 'modal' | 'default';

export type View = {
  mode: ViewMode;
  params?: UnknownObject;
};

export type CallToolResponse = {
  result: string;
};
