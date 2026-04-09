import { expect } from 'vitest';
import { defineEval } from 'sunpeak/eval';

export default defineEval({
  cases: [
    {
      name: 'asks for a map',
      prompt: 'Show me a map of coffee shops near downtown Austin',
      expect: {
        tool: 'show-map',
        args: { query: expect.stringMatching(/coffee/i) },
      },
    },
    {
      name: 'asks for nearby places',
      prompt: 'Find me some parks nearby',
      expect: {
        tool: 'show-map',
        args: { query: expect.stringMatching(/park/i) },
      },
    },
  ],
});
