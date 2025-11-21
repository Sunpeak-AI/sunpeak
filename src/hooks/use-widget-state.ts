import { useCallback, useMemo } from 'react';
import { useOpenAiGlobal } from './use-openai-global';
import type { UnknownObject } from '../types';

export function useWidgetState<T extends UnknownObject = UnknownObject>(): [
  T | null,
  (state: T) => Promise<void>
] {
  const widgetState = useOpenAiGlobal('widgetState') as T | null;
  const setWidgetState = useOpenAiGlobal('setWidgetState');

  const setter = useCallback(
    async (state: T) => {
      if (setWidgetState) {
        await setWidgetState(state);
      }
    },
    [setWidgetState]
  );

  return useMemo(() => [widgetState, setter], [widgetState, setter]);
}
