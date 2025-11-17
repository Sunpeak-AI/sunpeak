// Components
export { Button } from './components/Button';
export type { ButtonProps } from './components/Button';

export { Card } from './components/Card';
export type { CardProps } from './components/Card';

export { Carousel } from './components/Carousel';
export type { CarouselProps } from './components/Carousel';

export { GenAI } from './components/GenAI';
export type { GenAIProps, GenAIRenderProps } from './components/GenAI';

export { ChatGPTSimulator } from './components/ChatGPTSimulator';
export type { ChatGPTSimulatorProps } from './components/ChatGPTSimulator';

// Platform Context & Providers
export { PlatformProvider, usePlatform } from './context/PlatformContext';
export type { PlatformProviderProps } from './context/PlatformContext';

// Platform Adapters
export { chatgptPlatform, createPlatformRegistry } from './platforms';
export type { PlatformRegistry } from './platforms';

// Hooks
export { usePlatformGlobal } from './hooks/usePlatformGlobal';
export { useDisplayMode } from './hooks/useDisplayMode';
export { useMaxHeight } from './hooks/useMaxHeight';
export { useRequestDisplayMode } from './hooks/useRequestDisplayMode';
export { useColorScheme } from './hooks/useColorScheme';
export { useWidgetProps } from './hooks/useWidgetProps';
export { useWidgetState } from './hooks/useWidgetState';

// Types
export type {
  // Common types
  DisplayMode,
  Theme,
  DeviceType,
  UserAgent,
  SafeArea,
  SafeAreaInsets,
  UnknownObject,
  RequestDisplayMode,
  CallTool,
  CallToolResponse,
  // Platform types
  PlatformGlobals,
  PlatformAPI,
  PlatformAdapter,
  PlatformType,
  ChatGPTGlobals,
} from './types';
