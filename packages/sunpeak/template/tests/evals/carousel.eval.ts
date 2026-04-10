import { defineEval } from 'sunpeak/eval';

export default defineEval({
  cases: [
    {
      name: 'asks for popular places',
      prompt: 'Show me popular places to visit in Tokyo',
      expect: { tool: 'show-carousel' },
    },
    {
      name: 'asks for places to eat',
      prompt: 'Where should I eat in Paris?',
      expect: { tool: 'show-carousel' },
    },
  ],
});
