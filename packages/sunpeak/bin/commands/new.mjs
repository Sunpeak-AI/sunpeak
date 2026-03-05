#!/usr/bin/env node
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import * as clack from '@clack/prompts';
import { discoverResources } from '../lib/patterns.mjs';
import { detectPackageManager } from '../utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Default prompt for project name using clack text input.
 * @returns {Promise<string>}
 */
async function defaultPromptName() {
  const value = await clack.text({
    message: 'Project name',
    placeholder: 'my-app',
    defaultValue: 'my-app',
    validate: (v) => {
      if (v === 'template') return '"template" is a reserved name';
    },
  });
  if (clack.isCancel(value)) {
    clack.cancel('Cancelled.');
    process.exit(0);
  }
  return value;
}

/**
 * Default resource selection using clack multiselect.
 * @param {string[]} availableResources
 * @returns {Promise<string[]>}
 */
async function defaultSelectResources(availableResources) {
  const selected = await clack.multiselect({
    message: 'Resources (UIs) to include (space to toggle)',
    options: (() => {
      const maxLen = Math.max(...availableResources.map((r) => r.length));
      return availableResources.map((r) => ({
        value: r,
        label: `${r.padEnd(maxLen)}  (https://sunpeak.ai/docs/api-reference/resources/${r})`,
      }));
    })(),
    initialValues: availableResources,
    required: true,
  });
  if (clack.isCancel(selected)) {
    clack.cancel('Cancelled.');
    process.exit(0);
  }
  return selected;
}

/**
 * Default dependencies (real implementations)
 */
export const defaultDeps = {
  discoverResources,
  detectPackageManager,
  existsSync,
  mkdirSync,
  cpSync,
  readFileSync,
  writeFileSync,
  renameSync,
  execSync,
  execAsync,
  promptName: defaultPromptName,
  selectResources: defaultSelectResources,
  intro: clack.intro,
  outro: clack.outro,
  spinner: clack.spinner,
  console,
  process,
  cwd: () => process.cwd(),
  templateDir: join(__dirname, '..', '..', 'template'),
  rootPkgPath: join(__dirname, '..', '..', 'package.json'),
};

/**
 * Parse and validate resources input
 * @param {string} input - Comma or space separated resource names
 * @param {string[]} validResources - List of valid resource names
 * @param {Object} deps - Dependencies for testing
 * @returns {string[]} - Validated and deduplicated resource names
 */
export function parseResourcesInput(input, validResources, deps = defaultDeps) {
  const d = { ...defaultDeps, ...deps };

  // If no input, return all resources
  if (!input || input.trim() === '') {
    return validResources;
  }

  // Split by comma or space and trim
  const tokens = input
    .toLowerCase()
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Validate tokens
  const invalid = tokens.filter((t) => !validResources.includes(t));
  if (invalid.length > 0) {
    d.console.error(`Error: Invalid resource(s): ${invalid.join(', ')}`);
    d.console.error(`Valid resources are: ${validResources.join(', ')}`);
    d.process.exit(1);
  }

  // Remove duplicates
  return [...new Set(tokens)];
}

/**
 * Create a new Sunpeak project
 * @param {string} projectName - Name of the project directory
 * @param {string} resourcesArg - Optional comma/space separated resources to include
 * @param {Object} deps - Dependencies for testing
 */
export async function init(projectName, resourcesArg, deps = defaultDeps) {
  const d = { ...defaultDeps, ...deps };

  d.intro('☀️ sunpeak');

  // Discover available resources from template
  const availableResources = d.discoverResources();
  if (availableResources.length === 0) {
    d.console.error('Error: No resources found in template/src/resources/');
    d.process.exit(1);
  }

  if (!projectName) {
    projectName = await d.promptName();
  }

  if (projectName === 'template') {
    d.console.error('Error: "template" is a reserved name. Please choose another name.');
    d.process.exit(1);
  }

  // Use resources from args or interactively select them
  let selectedResources;
  if (resourcesArg !== undefined) {
    selectedResources = parseResourcesInput(resourcesArg, availableResources, d);
  } else {
    selectedResources = await d.selectResources(availableResources);
  }

  const targetDir = join(d.cwd(), projectName);

  if (d.existsSync(targetDir)) {
    d.console.error(`Error: Directory "${projectName}" already exists`);
    d.process.exit(1);
  }

  // Filter resource directories based on selection
  const excludedResources = availableResources.filter((r) => !selectedResources.includes(r));

  d.mkdirSync(targetDir, { recursive: true });

  d.cpSync(d.templateDir, targetDir, {
    recursive: true,
    filter: (src) => {
      const name = basename(src);

      // Skip node_modules and lock file
      if (name === 'node_modules' || name === 'pnpm-lock.yaml') {
        return false;
      }

      // Skip deps.json files (build-time metadata, not needed in scaffolded projects)
      if (name === 'deps.json' && src.includes('/resources/')) {
        return false;
      }

      for (const resource of excludedResources) {
        // Skip entire resource directory: src/resources/{resource}/
        if (src.includes('/resources/') && name === resource) {
          return false;
        }
        // Skip flat simulation files for excluded resources: tests/simulations/*.json
        if (src.includes('/tests/simulations/') && name.endsWith('.json')) {
          const baseName = name.replace(/\.json$/, '');
          if (baseName === resource || baseName.startsWith(resource + '-') || baseName.endsWith('-' + resource)) {
            return false;
          }
        }
        // Skip tool files for excluded resources: src/tools/*.ts
        if (src.includes('/src/tools/') && name.endsWith('.ts')) {
          const baseName = name.replace(/\.ts$/, '');
          if (baseName === resource || baseName.startsWith(resource + '-') || baseName.endsWith('-' + resource)) {
            return false;
          }
        }
        // Skip e2e test files for excluded resources
        if (src.includes('/tests/e2e/') && name === `${resource}.spec.ts`) {
          return false;
        }
      }

      return true;
    },
  });

  // Rename underscore-prefixed files to dotfiles
  const dotfiles = ['_gitignore', '_prettierignore', '_prettierrc'];
  for (const file of dotfiles) {
    const srcPath = join(targetDir, file);
    const destPath = join(targetDir, file.replace(/^_/, '.'));
    if (d.existsSync(srcPath)) {
      d.renameSync(srcPath, destPath);
    }
  }

  // Read sunpeak version from root package.json
  const rootPkg = JSON.parse(d.readFileSync(d.rootPkgPath, 'utf-8'));
  const sunpeakVersion = `^${rootPkg.version}`;

  // Update project package.json
  const pkgPath = join(targetDir, 'package.json');
  const pkg = JSON.parse(d.readFileSync(pkgPath, 'utf-8'));
  pkg.name = projectName;

  // Replace workspace:* with actual version
  if (pkg.dependencies?.sunpeak === 'workspace:*') {
    pkg.dependencies.sunpeak = sunpeakVersion;
  }

  // Prune dependencies not needed by selected resources
  if (excludedResources.length > 0 && pkg.dependencies) {
    const resourcesDir = join(d.templateDir, 'src', 'resources');
    const readDeps = (resource) => {
      const depsPath = join(resourcesDir, resource, 'deps.json');
      try { return JSON.parse(d.readFileSync(depsPath, 'utf-8')); } catch { return {}; }
    };

    // Deps needed by selected resources
    const needed = new Set(selectedResources.flatMap((r) => Object.keys(readDeps(r))));
    // Deps from excluded resources that no selected resource needs
    const removable = excludedResources
      .flatMap((r) => Object.keys(readDeps(r)))
      .filter((dep) => !needed.has(dep));

    for (const dep of removable) {
      delete pkg.dependencies[dep];
    }
  }

  d.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  // Install dependencies with spinner
  const pm = d.detectPackageManager();
  const s = d.spinner();
  s.start(`Installing dependencies with ${pm}...`);

  try {
    await d.execAsync(`${pm} install`, { cwd: targetDir });
    s.stop(`Installed dependencies with ${pm}`);
  } catch {
    s.stop(`Install failed. You can try running "${pm} install" manually.`);
  }

  const runCmd = pm === 'npm' ? 'npm run' : pm;

  d.outro(`Done! To get started:

  cd ${projectName}
  sunpeak dev

Your project commands:

  sunpeak dev       # Start dev server + MCP endpoint
  sunpeak build     # Build for production
  ${runCmd} test         # Run tests`);
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const [projectName, resources] = process.argv.slice(2);
  init(projectName, resources).catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
