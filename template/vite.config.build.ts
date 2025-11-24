import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';

// Plugin to inline CSS into the JS bundle
function inlineCssPlugin() {
  return {
    name: 'inline-css',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist/chatgpt');
      const jsFile = path.join(distDir, 'index.js');
      const cssFile = path.join(distDir, 'style.css');

      if (existsSync(cssFile) && existsSync(jsFile)) {
        const css = readFileSync(cssFile, 'utf-8');
        const js = readFileSync(jsFile, 'utf-8');

        // Inject CSS at the start of the JS file
        const injectCss = `(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);})();`;
        writeFileSync(jsFile, injectCss + js);

        // Remove the separate CSS file
        unlinkSync(cssFile);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), inlineCssPlugin()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      'sunpeak': path.resolve(__dirname, '../src'),
      '~': path.resolve(__dirname, '../src'),
    },
    conditions: ['style', 'import', 'module', 'browser', 'default'],
  },
  build: {
    target: 'es2020',
    lib: {
      entry: path.resolve(__dirname, 'src/index.chatgpt.tsx'),
      name: 'SunpeakApp',
      formats: ['iife'],
      fileName: () => 'index.js',
    },
    outDir: 'dist/chatgpt',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: '[name][extname]',
      },
    },
    minify: true,
    cssMinify: true,
  },
});
