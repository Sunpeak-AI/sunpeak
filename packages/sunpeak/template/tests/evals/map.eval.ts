import { defineEval } from 'sunpeak/eval';

export default defineEval({
  cases: [
    {
      name: 'asks for a map',
      prompt: 'Show me a map of coffee shops near downtown Austin',
      expect: { tool: 'show-map' },
    },
    {
      name: 'asks for nearby places',
      prompt: 'Show me parks near Central Park, New York',
      expect: { tool: 'show-map' },
    },
  ],
});
