import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'chatgpt/index': 'src/App.tsx',
  },
  format: ['esm'],
  dts: false,
  sourcemap: false,
  clean: true,
  external: [],
  treeshake: true,
  splitting: false,
  minify: true,
  outDir: 'dist',
  injectStyle: true,
  esbuildOptions(options) {
    options.bundle = true;
    options.platform = 'browser';
    options.target = 'es2020';
    options.jsx = 'automatic';
  },
});
