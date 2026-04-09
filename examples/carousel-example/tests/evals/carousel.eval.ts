import { expect } from 'vitest';
import { defineEval } from 'sunpeak/eval';

export default defineEval({
  cases: [
    {
      name: 'asks for popular places',
      prompt: 'Show me popular places to visit in Tokyo',
      expect: {
        tool: 'show-carousel',
        args: { city: expect.stringMatching(/tokyo/i) },
      },
    },
    {
      name: 'asks for restaurants',
      prompt: 'What are some good restaurants in Paris?',
      expect: {
        tool: 'show-carousel',
        args: {
          city: expect.stringMatching(/paris/i),
          categories: expect.arrayContaining([expect.stringMatching(/restaurant|food|dining/i)]),
        },
      },
    },
  ],
});
