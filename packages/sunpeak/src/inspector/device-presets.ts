import type { McpUiDisplayMode, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import type { ScreenWidth } from './inspector-types';

type Platform = NonNullable<McpUiHostContext['platform']>;

export type DevicePresetId = 'iphone-se' | 'iphone-15' | 'iphone-15-pro-max' | 'ipad';
export type DevicePresetSelection = DevicePresetId | 'custom';

export interface DevicePreset {
  id: DevicePresetId;
  label: string;
  displayMode: McpUiDisplayMode;
  screenWidth: ScreenWidth;
  platform: Platform;
  hover: boolean;
  touch: boolean;
  containerHeight: number;
  containerWidth: number;
  containerMaxHeight?: number;
  containerMaxWidth?: number;
  safeAreaInsets: { top: number; bottom: number; left: number; right: number };
}

export const CUSTOM_DEVICE_PRESET = 'custom';

export const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: 'iphone-se',
    label: 'iPhone SE',
    displayMode: 'fullscreen',
    screenWidth: 'mobile-s',
    platform: 'mobile',
    hover: false,
    touch: true,
    containerWidth: 375,
    containerHeight: 667,
    safeAreaInsets: { top: 20, bottom: 0, left: 0, right: 0 },
  },
  {
    id: 'iphone-15',
    label: 'iPhone 15',
    displayMode: 'fullscreen',
    screenWidth: 'mobile-m',
    platform: 'mobile',
    hover: false,
    touch: true,
    containerWidth: 393,
    containerHeight: 852,
    safeAreaInsets: { top: 59, bottom: 34, left: 0, right: 0 },
  },
  {
    id: 'iphone-15-pro-max',
    label: 'iPhone 15 Pro Max',
    displayMode: 'fullscreen',
    screenWidth: 'mobile-xl',
    platform: 'mobile',
    hover: false,
    touch: true,
    containerWidth: 430,
    containerHeight: 932,
    safeAreaInsets: { top: 59, bottom: 34, left: 0, right: 0 },
  },
  {
    id: 'ipad',
    label: 'iPad',
    displayMode: 'fullscreen',
    screenWidth: 'tablet-l',
    platform: 'mobile',
    hover: false,
    touch: true,
    containerWidth: 820,
    containerHeight: 1180,
    safeAreaInsets: { top: 24, bottom: 20, left: 0, right: 0 },
  },
];

export const DEVICE_PRESET_BY_ID: Record<DevicePresetId, DevicePreset> = DEVICE_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.id] = preset;
    return acc;
  },
  {} as Record<DevicePresetId, DevicePreset>
);

const DEVICE_PRESET_IDS = new Set<DevicePresetId>(DEVICE_PRESETS.map((preset) => preset.id));

export function isDevicePresetSelection(value: string): value is DevicePresetSelection {
  return value === CUSTOM_DEVICE_PRESET || DEVICE_PRESET_IDS.has(value as DevicePresetId);
}

export function getDevicePreset(id: DevicePresetSelection | undefined): DevicePreset | undefined {
  if (!id || id === CUSTOM_DEVICE_PRESET) return undefined;
  const presetId: DevicePresetId = id;
  return DEVICE_PRESET_BY_ID[presetId];
}
