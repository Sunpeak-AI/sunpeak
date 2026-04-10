/**
 * Model registry — maps model ID strings to AI SDK provider instances.
 *
 * Provider packages are dynamically imported so users only need to install
 * the providers they actually use.
 */

/**
 * @typedef {{ modelId: string, providerPackage: string }} ModelMapping
 */

/**
 * Detect which provider package a model ID belongs to.
 * @param {string} modelId
 * @returns {string} Provider package name
 */
function getProviderPackage(modelId) {
  if (/^(gpt-|o[134]-|o[134]$|chatgpt-)/.test(modelId)) return '@ai-sdk/openai';
  if (/^claude-/.test(modelId)) return '@ai-sdk/anthropic';
  if (/^(gemini-|models\/gemini-)/.test(modelId)) return '@ai-sdk/google';
  throw new Error(
    `Unknown model: "${modelId}". Expected a recognized prefix (gpt-, claude-, gemini-, o1-, o3-, o4-).`
  );
}

/**
 * Resolve a model ID string to an AI SDK LanguageModel instance.
 * @param {string} modelId - e.g., 'gpt-4o', 'claude-sonnet-4-20250514', 'gemini-2.0-flash'
 * @returns {Promise<import('ai').LanguageModel>}
 */
export async function resolveModel(modelId) {
  const pkg = getProviderPackage(modelId);

  let provider;
  try {
    provider = await import(pkg);
  } catch {
    throw new Error(
      `Provider package "${pkg}" is not installed. Install it to use ${modelId}:\n\n  pnpm add -D ${pkg}\n`
    );
  }

  // Each provider package exports a default function or named function
  // that creates model instances: openai('gpt-4o'), anthropic('claude-...'), google('gemini-...')
  if (pkg === '@ai-sdk/openai') {
    const { openai } = provider;
    return openai(modelId);
  }
  if (pkg === '@ai-sdk/anthropic') {
    const { anthropic } = provider;
    return anthropic(modelId);
  }
  if (pkg === '@ai-sdk/google') {
    const { google } = provider;
    return google(modelId);
  }

  throw new Error(`No provider factory found for ${pkg}`);
}

/**
 * Check that the `ai` core package is installed.
 * @returns {Promise<void>}
 */
export async function checkAiSdkInstalled() {
  try {
    await import('ai');
  } catch {
    throw new Error(
      'The "ai" package is not installed. Install it to use evals:\n\n  pnpm add -D ai\n'
    );
  }
}
