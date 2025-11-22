import { useOpenAiGlobal } from './use-openai-global';
import type { UnknownObject } from '../types';

export function useToolInput<T extends UnknownObject = UnknownObject>(): T | null {
  return useOpenAiGlobal('toolInput') as T | null;
}
