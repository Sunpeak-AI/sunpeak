/**
 * Shared eval provider definitions used by both `sunpeak new` and `sunpeak test init`.
 * Single source of truth for provider packages, model IDs, and CLI labels.
 */

export const EVAL_PROVIDERS = [
  { pkg: '@ai-sdk/openai', models: ['gpt-4o', 'gpt-4o-mini'], label: 'OpenAI       (gpt-4o, gpt-4o-mini)', envVar: 'OPENAI_API_KEY' },
  { pkg: '@ai-sdk/anthropic', models: ['claude-sonnet-4-20250514'], label: 'Anthropic    (claude-sonnet-4)', envVar: 'ANTHROPIC_API_KEY' },
  { pkg: '@ai-sdk/google', models: ['gemini-2.0-flash'], label: 'Google       (gemini-2.0-flash)', envVar: 'GOOGLE_GENERATIVE_AI_API_KEY' },
];

/**
 * All model lines that appear in eval.config.ts, in order.
 * Used by scaffoldEvals to generate the config and by the uncomment logic.
 */
export const EVAL_CONFIG_MODELS = [
  { id: 'gpt-4o', envVar: 'OPENAI_API_KEY' },
  { id: 'gpt-4o-mini', envVar: 'OPENAI_API_KEY' },
  { id: 'o4-mini', envVar: 'OPENAI_API_KEY' },
  { id: 'claude-sonnet-4-20250514', envVar: 'ANTHROPIC_API_KEY' },
  { id: 'gemini-2.0-flash', envVar: 'GOOGLE_GENERATIVE_AI_API_KEY' },
];

/**
 * Generate the models section lines for eval.config.ts.
 * @returns {string[]}
 */
export function generateModelLines() {
  const maxIdLen = Math.max(...EVAL_CONFIG_MODELS.map((m) => m.id.length));
  return EVAL_CONFIG_MODELS.map((m) => {
    const padded = `'${m.id}',`.padEnd(maxIdLen + 3);
    return `    // ${padded} // ${m.envVar}`;
  });
}
