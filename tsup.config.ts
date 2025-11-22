import { defineConfig } from 'tsup';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  treeshake: true,
  splitting: false,
  minify: false,
  outDir: 'dist',
  esbuildOptions(options) {
    options.alias = {
      '~': './src',
    };
  },
  onSuccess: async () => {
    // Copy chatgpt styles
    const chatgptDir = path.join('dist', 'styles', 'chatgpt');
    fs.mkdirSync(chatgptDir, { recursive: true });
    fs.copyFileSync(
      path.join('src', 'styles', 'chatgpt', 'index.css'),
      path.join(chatgptDir, 'index.css')
    );
    // Copy globals.css
    fs.copyFileSync(
      path.join('src', 'styles', 'globals.css'),
      path.join('dist', 'styles', 'globals.css')
    );
  },
});
