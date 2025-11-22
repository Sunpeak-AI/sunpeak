import { useOpenAiGlobal } from './use-openai-global';

export const useLocale = (): string | null => {
  return useOpenAiGlobal('locale');
};
