/**
 * Shared lightningcss configuration for all Vite instances that process Tailwind CSS.
 *
 * Tailwind v4's `@source` directive is consumed by `@tailwindcss/vite` but may
 * still be visible to lightningcss during parsing/minification, producing
 * "Unknown at rule: @source" warnings. Declaring it as a custom at-rule
 * tells lightningcss the rule is intentional.
 */
export const lightningcssConfig = {
  customAtRules: {
    source: { prelude: '<string>' },
  },
};
