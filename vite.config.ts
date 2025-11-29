import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { builtinModules } from 'module';
import { copyFileSync, mkdirSync } from 'fs';

// Node.js built-in modules to externalize
const nodeBuiltins = builtinModules.flatMap((m) => [m, `node:${m}`]);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      outDir: 'dist',
      rollupTypes: false,
    }),
    // Copy CSS files to dist after build
    {
      name: 'copy-css',
      closeBundle() {
        // Copy style.css to dist
        copyFileSync(
          resolve(__dirname, 'src/style.css'),
          resolve(__dirname, 'dist/style.css')
        );
        // Copy chatgpt/globals.css to dist/chatgpt
        mkdirSync(resolve(__dirname, 'dist/chatgpt'), { recursive: true });
        copyFileSync(
          resolve(__dirname, 'src/chatgpt/globals.css'),
          resolve(__dirname, 'dist/chatgpt/globals.css')
        );
      },
    },
  ],
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'mcp/index': resolve(__dirname, 'src/mcp/index.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        const ext = format === 'es' ? 'js' : 'cjs';
        return `${entryName}.${ext}`;
      },
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@modelcontextprotocol/sdk',
        '@modelcontextprotocol/sdk/server/index.js',
        '@modelcontextprotocol/sdk/server/stdio.js',
        '@modelcontextprotocol/sdk/server/sse.js',
        'zod',
        'raw-body',
        ...nodeBuiltins,
      ],
      output: {
        preserveModules: false,
        assetFileNames: '[name][extname]',
      },
    },
  },
});
