import { expect } from 'vitest';
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
      prompt: 'Write a launch announcement for X and LinkedIn',
      expect: {
        tool: 'review-post',
        args: { platforms: expect.arrayContaining([expect.stringMatching(/x|twitter/i)]) },
      },
    },
    {
      name: 'asks to review a purchase',
      prompt: 'Review my order for the Pro plan upgrade',
      expect: { tool: 'review-purchase' },
    },

    // --- Other assertion patterns ---
    //
    // Multi-step (ordered tool call sequence):
    //   {
    //     name: 'multi-step flow',
    //     prompt: 'Draft a post and then review it',
    //     maxSteps: 3,
    //     expect: [
    //       { tool: 'review-post' },
    //       { tool: 'publish-post' },
    //     ],
    //   },
    //
    // Custom assertion (full access to result):
    //   {
    //     name: 'custom check',
    //     prompt: 'Show me my recent reviews',
    //     assert: (result) => {
    //       expect(result.toolCalls).toHaveLength(1);
    //       expect(result.toolCalls[0].name).toBe('review-diff');
    //     },
    //   },
  ],
});
