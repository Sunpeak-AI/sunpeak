import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// Check if we're in the sunpeak workspace (directory is named "template")
const isTemplate = path.basename(__dirname) === 'template';
const parentSrc = path.resolve(__dirname, '../src');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // In workspace dev mode, use local sunpeak source
      ...(isTemplate && {
        'sunpeak': parentSrc,
        '~': parentSrc,
      }),
    },
    // Enable "style" condition for CSS-only packages like tw-animate-css
    conditions: ['style'],
  },
  server: {
    port: 6767,
    open: true,
  },
});
