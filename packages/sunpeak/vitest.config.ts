import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    maxWorkers: 1,
    pool: 'threads',
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/template/**', '**/tests/**'],
  },
});
