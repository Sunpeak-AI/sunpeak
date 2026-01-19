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
    // Copy chatgpt CSS to dist for separate import
    {
      name: 'copy-chatgpt-css',
      closeBundle() {
        mkdirSync(resolve(__dirname, 'dist/chatgpt'), { recursive: true });
        copyFileSync(
          resolve(__dirname, 'src/chatgpt/globals.css'),
          resolve(__dirname, 'dist/chatgpt/globals.css')
        );
      },
    },
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'chatgpt/index': resolve(__dirname, 'src/chatgpt/index.ts'),
        'mcp/index': resolve(__dirname, 'src/mcp/index.ts'),
        'mcp/entry': resolve(__dirname, 'src/mcp/entry.ts'),
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
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.[0]?.endsWith('.css')) {
            return 'style.css';
          }
          return '[name][extname]';
        },
      },
    },
  },
});
