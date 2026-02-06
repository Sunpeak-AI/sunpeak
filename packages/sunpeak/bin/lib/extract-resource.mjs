import path from 'path';

/**
 * Extract the `resource` named export from a resource .tsx file.
 *
 * Uses esbuild to bundle only the `resource` export, stubbing all of the
 * resource file's own imports (React, components, etc.) so only the static
 * config object is evaluated.
 */
export async function extractResourceExport(tsxPath) {
  const esbuild = await import('esbuild');
  const absolutePath = path.resolve(tsxPath);
  const dir = path.dirname(absolutePath);
  const base = path.basename(absolutePath);

  const result = await esbuild.build({
    stdin: {
      contents: `export { resource } from './${base}';`,
      resolveDir: dir,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'cjs',
    treeShaking: true,
    loader: { '.tsx': 'tsx', '.ts': 'ts', '.jsx': 'jsx' },
    logLevel: 'silent',
    plugins: [
      {
        name: 'externalize-deps',
        setup(build) {
          let entryResolved = false;
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.kind !== 'import-statement') return;
            if (!entryResolved) {
              entryResolved = true;
              return;
            }
            return { external: true };
          });
        },
      },
    ],
  });

  if (!result.outputFiles?.length) {
    throw new Error(`Failed to extract resource from ${tsxPath}`);
  }

  const code = result.outputFiles[0].text;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', code)(mod, mod.exports, () => ({}));

  const resource = mod.exports.resource;
  if (!resource) {
    throw new Error(
      `No "resource" export found in ${tsxPath}. ` +
        `Add: export const resource = { name: '...', ... };`
    );
  }

  return resource;
}
