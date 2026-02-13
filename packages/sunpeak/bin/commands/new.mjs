#!/usr/bin/env node
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { execSync } from 'child_process';
import { discoverResources } from '../lib/patterns.mjs';
import { detectPackageManager } from '../utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Default prompt implementation using readline
 * @param {string} question
 * @returns {Promise<string>}
 */
function defaultPrompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
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
  prompt: defaultPrompt,
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

  // Discover available resources from template
  const availableResources = d.discoverResources();
  if (availableResources.length === 0) {
    d.console.error('Error: No resources found in template/src/resources/');
    d.process.exit(1);
  }

  if (!projectName) {
    projectName = await d.prompt('☀️ 🏔️ Project name [my-app]: ');
    if (!projectName) {
      projectName = 'my-app';
    }
  }

  if (projectName === 'template') {
    d.console.error('Error: "template" is a reserved name. Please choose another name.');
    d.process.exit(1);
  }

  // Use resources from args or ask for them
  let resourcesInput;
  if (resourcesArg) {
    resourcesInput = resourcesArg;
    d.console.log(`☀️ 🏔️ Resources: ${resourcesArg}`);
  } else {
    resourcesInput = await d.prompt(
      `☀️ 🏔️ Resources (UIs) to include [${availableResources.join(', ')}]: `
    );
  }
  const selectedResources = parseResourcesInput(resourcesInput, availableResources, d);

  const targetDir = join(d.cwd(), projectName);

  if (d.existsSync(targetDir)) {
    d.console.error(`Error: Directory "${projectName}" already exists`);
    d.process.exit(1);
  }

  d.console.log(`☀️ 🏔️ Creating ${projectName}...`);

  d.mkdirSync(targetDir, { recursive: true });

  // Filter resource directories based on selection
  const excludedResources = availableResources.filter((r) => !selectedResources.includes(r));

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
        // Skip simulation directories for excluded resources: tests/simulations/{resource}/
        if (src.includes('/tests/simulations/') && name === resource) {
          return false;
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

  // Detect package manager and run install
  const pm = d.detectPackageManager();
  d.console.log(`☀️ 🏔️ Installing dependencies with ${pm}...`);

  try {
    d.execSync(`${pm} install`, { cwd: targetDir, stdio: 'inherit' });
  } catch {
    d.console.error(`\nInstall failed. You can try running "${pm} install" manually in the project directory.`);
  }

  const runCmd = pm === 'npm' ? 'npm run' : pm;

  d.console.log(`
Done! To get started:

  cd ${projectName}
  sunpeak dev

That's it! Your project commands:

  sunpeak dev       # Start dev server + MCP endpoint
  sunpeak build     # Build for production
  ${runCmd} test         # Run tests

See README.md for more details.
`);
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const [projectName, resources] = process.argv.slice(2);
  init(projectName, resources).catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
