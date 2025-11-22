import { useOpenAiGlobal } from './use-openai-global';
import type { UserAgent } from '../types';

export const useUserAgent = (): UserAgent | null => {
  return useOpenAiGlobal('userAgent');
};
