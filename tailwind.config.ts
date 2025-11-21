import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--sp-radius-lg)',
        md: 'var(--sp-radius-md)',
        sm: 'var(--sp-radius-sm)',
      },
      colors: {
        background: 'var(--sp-color-bg-primary)',
        foreground: 'var(--sp-color-text-primary)',
        border: 'var(--sp-color-border)',
      },
      fontFamily: {
        sans: 'var(--sp-font-family)',
      },
    },
  },
  plugins: [],
} satisfies Config;
