import { defineConfig } from 'vitest/config';
import path from 'path';

// Check if we're in the sunpeak workspace (directory is named "template")
const isTemplate = path.basename(__dirname) === 'template';
const parentSrc = path.resolve(__dirname, '../src');

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  resolve: {
    alias: {
      // In workspace dev mode, use local sunpeak source
      ...(isTemplate && {
        'sunpeak': parentSrc,
        '~': parentSrc,
      }),
    },
  },
});
