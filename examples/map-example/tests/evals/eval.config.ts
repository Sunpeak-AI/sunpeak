import { defineEvalConfig } from 'sunpeak/eval';

// API keys are loaded automatically from tests/evals/.env (gitignored).
// See .env.example for the format.

export default defineEvalConfig({
  // Server is auto-detected for sunpeak projects.
  // For non-sunpeak projects, uncomment:
  // server: 'http://localhost:8000/mcp',

  models: [
    // Uncomment models and install their provider packages:
    // 'gpt-4o',                      // OPENAI_API_KEY
    // 'gpt-4o-mini',                 // OPENAI_API_KEY
    // 'o4-mini',                     // OPENAI_API_KEY
    // 'claude-sonnet-4-20250514',    // ANTHROPIC_API_KEY
    // 'gemini-2.0-flash',            // GOOGLE_GENERATIVE_AI_API_KEY
  ],

  defaults: {
    runs: 10, // Number of times to run each case per model
    maxSteps: 1, // Max tool call steps per run
    temperature: 0, // 0 for most deterministic results
    timeout: 30_000, // Timeout per run in ms
  },
});
