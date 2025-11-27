import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync } from 'fs';

// Check if we're in the sunpeak workspace (directory is named "template")
const isTemplate = path.basename(__dirname) === 'template';
const parentSrc = path.resolve(__dirname, '../src');

// Plugin to inline CSS into the JS bundle for all output files
function inlineCssPlugin() {
  return {
    name: 'inline-css',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist/chatgpt');
      const cssFile = path.join(distDir, 'style.css');

      if (existsSync(cssFile)) {
        const css = readFileSync(cssFile, 'utf-8');
        const injectCss = `(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);})();`;

        // Find all .js files in the dist directory and inject CSS
        const files = readdirSync(distDir);
        files.forEach(file => {
          if (file.endsWith('.js')) {
            const jsFile = path.join(distDir, file);
            const js = readFileSync(jsFile, 'utf-8');
            writeFileSync(jsFile, injectCss + js);
          }
        });

        // Remove the separate CSS file after injecting into all bundles
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
      // In workspace dev mode, use local sunpeak source
      ...(isTemplate && {
        'sunpeak': parentSrc,
        '~': parentSrc,
      }),
    },
    conditions: ['style', 'import', 'module', 'browser', 'default'],
  },
  build: {
    target: 'es2020',
    outDir: 'dist/chatgpt',
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, process.env.ENTRY_FILE || 'src/index-app.tsx'),
      name: 'SunpeakApp',
      formats: ['iife'],
      fileName: () => process.env.OUTPUT_FILE || 'app.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: 'style.css',
      },
    },
    minify: true,
    cssMinify: true,
  },
});
