import { type DisplayMode } from '../types';
import { useOpenAiGlobal } from './use-openai-global';

export const useDisplayMode = (): DisplayMode | null => {
  return useOpenAiGlobal('displayMode');
};
