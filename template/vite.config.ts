import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

// Check if we're in the sunpeak workspace
const parentPkgPath = path.resolve(__dirname, '../package.json');
const parentSrc = path.resolve(__dirname, '../src');
let isSunpeakWorkspace = false;

if (fs.existsSync(parentPkgPath) && fs.existsSync(parentSrc)) {
  try {
    const parentPkg = JSON.parse(fs.readFileSync(parentPkgPath, 'utf-8'));
    isSunpeakWorkspace = parentPkg.name === 'sunpeak';
  } catch {}
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // In workspace dev mode, use local sunpeak source
      ...(isSunpeakWorkspace && { 'sunpeak': parentSrc }),
    },
  },
  server: {
    port: 6767,
    open: true,
  },
});
