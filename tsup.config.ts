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
  onSuccess: async () => {
    const stylesDir = path.join('dist', 'styles', 'chatgpt');
    fs.mkdirSync(stylesDir, { recursive: true });
    fs.copyFileSync(
      path.join('src', 'styles', 'chatgpt', 'index.css'),
      path.join(stylesDir, 'index.css')
    );
  },
});
