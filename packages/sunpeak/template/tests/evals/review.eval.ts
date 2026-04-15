import { defineEval } from 'sunpeak/eval';

export default defineEval({
  cases: [
    {
      name: 'asks to review a code diff',
      prompt: 'Review my code changes to the auth module',
      expect: { tool: 'review-diff' },
    },
    {
      name: 'asks to draft a social post',
      prompt:
        'Draft a social media post announcing our new AI features launching today, for X and LinkedIn',
      expect: { tool: 'review-post' },
    },
    {
      name: 'asks to review a purchase',
      prompt:
        'Show me a purchase review for cart abc-123 with the Pro plan item, shipping to address addr-1 via standard shipping, paying with card pm-1',
      expect: { tool: 'review-purchase' },
    },

    // To also check argument extraction, add args expectations
    // (import { expect } from 'vitest' to use matchers):
    // {
    //   name: 'passes platforms',
    //   prompt: 'Write a launch announcement for X and LinkedIn',
    //   expect: {
    //     tool: 'review-post',
    //     args: { platforms: expect.arrayContaining([expect.stringMatching(/x|twitter/i)]) },
    //   },
    // },
    //
    // Multi-step (ordered tool call sequence):
    // {
    //   name: 'multi-step flow',
    //   prompt: 'Draft a post and then review it',
    //   maxSteps: 3,
    //   expect: [
    //     { tool: 'review-post' },
    //     { tool: 'publish-post' },
    //   ],
    // },
    //
    // Custom assertion (full access to result):
    // {
    //   name: 'custom check',
    //   prompt: 'Show me my recent reviews',
    //   assert: (result) => {
    //     expect(result.toolCalls).toHaveLength(1);
    //     expect(result.toolCalls[0].name).toBe('review-diff');
    //   },
    // },
  ],
});
