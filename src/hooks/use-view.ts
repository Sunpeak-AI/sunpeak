import { useOpenAiGlobal } from './use-openai-global';
import type { View } from '../types';

export function useView(): View | null {
  return useOpenAiGlobal('view') as View | null;
}
