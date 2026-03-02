import path from 'path';

/**
 * Extract the `tool` named export from a tool .ts file.
 *
 * Uses esbuild in ESM mode to compile TypeScript and tree-shake to just the
 * `tool` export. ESM tree-shaking drops unused exports (schema, handler) so
 * their dependencies (zod, etc.) are never evaluated.
 *
 * `schema` and `default` handler are loaded at runtime via Vite SSR.
 */
export async function extractToolExport(
  tsPath: string
): Promise<{ tool: Record<string, unknown> }> {
  const esbuild = await import('esbuild');
  const absolutePath = path.resolve(tsPath);
  const dir = path.dirname(absolutePath);
  const base = path.basename(absolutePath);

  const result = await esbuild.build({
    stdin: {
      contents: `export { tool } from './${base}';`,
      resolveDir: dir,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    treeShaking: true,
    loader: { '.tsx': 'tsx', '.ts': 'ts', '.jsx': 'jsx' },
    logLevel: 'silent',
    plugins: [
      {
        name: 'externalize-node-modules',
        setup(build) {
          // Resolve relative imports normally (resource files, local modules)
          // but externalize everything from node_modules
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.kind !== 'import-statement') return;
            // Bare specifiers (not starting with . or /) are node_modules
            if (!args.path.startsWith('.') && !args.path.startsWith('/')) {
              return { external: true };
            }
            return undefined;
          });
        },
      },
    ],
  });

  if (!result.outputFiles?.length) {
    throw new Error(`Failed to extract tool from ${tsPath}`);
  }

  // Strip import statements and export block so we can eval as plain JS.
  // `tool` is pure data (no dependencies), so stripping imports is safe.
  // Other top-level code (schema, etc.) may reference stripped imports but
  // we only need the `tool` variable — errors in other code are caught and ignored.
  const code = result.outputFiles[0].text
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export\s*\{[^}]*\}\s*;?\s*$/m, '');
  let tool: Record<string, unknown> | undefined;
  try {
    const fn = new Function(code + '\nreturn tool;');
    tool = fn() as Record<string, unknown> | undefined;
  } catch {
    // If other top-level code crashes (e.g. schema using stripped zod),
    // extract just the tool variable declaration and eval that alone.
    const toolMatch = result.outputFiles[0].text.match(/var tool\s*=\s*(\{[\s\S]*?\n\});/);
    if (toolMatch) {
      tool = new Function('return ' + toolMatch[1])() as Record<string, unknown>;
    }
  }
  if (!tool) {
    throw new Error(
      `No "tool" export found in ${tsPath}. ` +
        `Add: export const tool: AppToolConfig = { resource, ... };`
    );
  }

  return { tool };
}
