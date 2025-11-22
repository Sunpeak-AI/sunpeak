import { useOpenAiGlobal } from './use-openai-global';
import type { SafeArea } from '../types';

export const useSafeArea = (): SafeArea | null => {
  return useOpenAiGlobal('safeArea');
};
