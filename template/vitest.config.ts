import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  resolve: {
    alias: {
      'sunpeak': path.resolve(__dirname, '../src'),
      '~': path.resolve(__dirname, '../src'),
    },
  },
});
