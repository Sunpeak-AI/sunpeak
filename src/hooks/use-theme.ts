import { type Theme } from '../types';
import { useOpenAiGlobal } from './use-openai-global';

export const useTheme = (): Theme | null => {
  return useOpenAiGlobal('theme');
};
