import { defineEval } from 'sunpeak/eval';

export default defineEval({
  cases: [
    {
      name: 'asks for photo albums',
      prompt: 'Show me my photo albums',
      expect: { tool: 'show-albums' },
    },
    {
      name: 'asks for food photos',
      prompt: 'Show me photos from my Austin pizza tour',
      expect: { tool: 'show-albums' },
    },
    {
      name: 'asks for a specific category',
      prompt: 'Show me my travel photos',
      expect: { tool: 'show-albums' },
    },
    // To also check argument extraction, add args expectations
    // (import { expect } from 'vitest' to use matchers):
    // {
    //   name: 'passes search term',
    //   prompt: 'Show me photos from my Austin pizza tour',
    //   expect: {
    //     tool: 'show-albums',
    //     args: { search: expect.stringMatching(/pizza|austin/i) },
    //   },
    // },
  ],
});
