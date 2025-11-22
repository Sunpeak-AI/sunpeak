import { useOpenAiGlobal } from './use-openai-global';
import type { UnknownObject } from '../types';

export function useToolResponseMetadata<T extends UnknownObject = UnknownObject>(): T | null {
  return useOpenAiGlobal('toolResponseMetadata') as T | null;
}
