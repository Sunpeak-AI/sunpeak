import { defineConfig } from 'tsup';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import type { Plugin } from 'esbuild';
import fs from 'fs';

function postcssPlugin(): Plugin {
  return {
    name: 'postcss',
    setup(build) {
      build.onLoad({ filter: /\.css$/ }, async (args) => {
        const css = fs.readFileSync(args.path, 'utf8');
        const result = await postcss([tailwindcss()]).process(css, {
          from: args.path,
        });
        return {
          contents: result.css,
          loader: 'css',
        };
      });
    },
  };
}

export default defineConfig({
  entry: {
    'chatgpt/index': 'src/index.chatgpt.tsx',
  },
  format: ['iife'],
  dts: false,
  sourcemap: false,
  clean: true,
  external: [],
  noExternal: [/.*/],
  treeshake: true,
  splitting: false,
  minify: true,
  outDir: 'dist',
  injectStyle: true,
  globalName: 'SunpeakApp',
  esbuildPlugins: [postcssPlugin()],
  esbuildOptions(options) {
    options.bundle = true;
    options.platform = 'browser';
    options.target = 'es2020';
    options.jsx = 'automatic';
    // Enable "style" condition for CSS-only packages like tw-animate-css
    options.conditions = ['style', 'import', 'module', 'browser', 'default'];
  },
});
