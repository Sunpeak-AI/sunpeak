#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = join(__dirname, 'commands');

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function checkPackageJson() {
  const pkgPath = join(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) {
    console.error('Error: No package.json found in current directory.');
    console.error('Make sure you are in a Sunpeak project directory.');
    process.exit(1);
  }
}

function parseResourcesInput(input) {
  const VALID_RESOURCES = ['albums', 'carousel', 'counter', 'map'];

  // If no input, return all resources
  if (!input || input.trim() === '') {
    return VALID_RESOURCES;
  }

  // Split by comma or space and trim
  const tokens = input
    .toLowerCase()
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Validate tokens
  const invalid = tokens.filter((t) => !VALID_RESOURCES.includes(t));
  if (invalid.length > 0) {
    console.error(`Error: Invalid resource(s): ${invalid.join(', ')}`);
    console.error(`Valid resources are: ${VALID_RESOURCES.join(', ')}`);
    process.exit(1);
  }

  // Remove duplicates
  return [...new Set(tokens)];
}

function updateIndexFiles(targetDir, selectedResources) {
  // Map resource names to their component/export names
  const resourceMap = {
    albums: { component: 'album', resourceClass: 'AlbumsResource', simulation: 'albums' },
    carousel: { component: 'carousel', resourceClass: 'CarouselResource', simulation: 'carousel' },
    counter: { component: null, resourceClass: 'CounterResource', simulation: 'counter' },
    map: { component: 'map', resourceClass: 'MapResource', simulation: 'map' },
  };

  // Update components/index.ts
  const componentsIndexPath = join(targetDir, 'src', 'components', 'index.ts');
  const componentExports = selectedResources
    .map((r) => resourceMap[r].component)
    .filter((comp) => comp !== null) // Filter out null components
    .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
    .map((comp) => `export * from './${comp}';`)
    .join('\n');
  writeFileSync(componentsIndexPath, componentExports + '\n');

  // Update resources/index.ts
  const resourcesIndexPath = join(targetDir, 'src', 'resources', 'index.ts');
  const resourceExports = selectedResources
    .map((r) => `export { ${resourceMap[r].resourceClass} } from './${r}-resource';`)
    .join('\n');
  writeFileSync(resourcesIndexPath, resourceExports + '\n');

  // Update simulations/index.ts
  const simulationsIndexPath = join(targetDir, 'src', 'simulations', 'index.ts');
  const simulationImports = selectedResources
    .map((r) => `import { ${r}Simulation } from './${r}-simulation.js';`)
    .join('\n');
  const simulationExports = selectedResources.map((r) => `  ${r}: ${r}Simulation,`).join('\n');
  const simulationsContent = `/**
 * Server-safe simulation configurations
 *
 * This file contains only metadata and can be safely imported in Node.js contexts
 * (like MCP servers) without causing issues with CSS imports or React components.
 */

${simulationImports}

export const SIMULATIONS = {
${simulationExports}
} as const;
`;
  writeFileSync(simulationsIndexPath, simulationsContent);
}

async function init(projectName, resourcesArg) {
  if (!projectName) {
    projectName = await prompt('☀️ 🏔️ Project name [my-app]: ');
    if (!projectName) {
      projectName = 'my-app';
    }
  }

  if (projectName === 'template') {
    console.error('Error: "template" is a reserved name. Please choose another name.');
    process.exit(1);
  }

  // Use resources from args or ask for them
  let resourcesInput;
  if (resourcesArg) {
    resourcesInput = resourcesArg;
    console.log(`☀️ 🏔️ Resources: ${resourcesArg}`);
  } else {
    resourcesInput = await prompt(
      '☀️ 🏔️ Resources (UIs) to include [albums, carousel, counter, map]: '
    );
  }
  const selectedResources = parseResourcesInput(resourcesInput);

  const targetDir = join(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    console.error(`Error: Directory "${projectName}" already exists`);
    process.exit(1);
  }

  const templateDir = join(__dirname, '..', 'template');

  console.log(`☀️ 🏔️ Creating ${projectName}...`);

  mkdirSync(targetDir, { recursive: true });

  // Map resource names to their component directory names
  const resourceComponentMap = {
    albums: 'album',
    carousel: 'carousel',
    counter: null, // Counter doesn't have a component directory
    map: 'map',
  };

  cpSync(templateDir, targetDir, {
    recursive: true,
    filter: (src) => {
      const name = basename(src);

      // Skip node_modules and lock file
      if (name === 'node_modules' || name === 'pnpm-lock.yaml') {
        return false;
      }

      // Filter resource files based on selection
      const VALID_RESOURCES = ['albums', 'carousel', 'counter', 'map'];
      const excludedResources = VALID_RESOURCES.filter((r) => !selectedResources.includes(r));

      for (const resource of excludedResources) {
        // Skip resource files
        if (name === `${resource}-resource.tsx` || name === `${resource}-resource.test.tsx`) {
          return false;
        }
        // Skip simulation files
        if (name === `${resource}-simulation.ts`) {
          return false;
        }
        // Skip component directories (map resource name to component dir name)
        const componentDirName = resourceComponentMap[resource];
        if (componentDirName && src.includes('/components/') && name === componentDirName) {
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
    if (existsSync(srcPath)) {
      renameSync(srcPath, destPath);
    }
  }

  // Read sunpeak version from root package.json
  const rootPkgPath = join(__dirname, '..', 'package.json');
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
  const sunpeakVersion = `^${rootPkg.version}`;

  // Update project package.json
  const pkgPath = join(targetDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.name = projectName;

  // Replace workspace:* with actual version
  if (pkg.dependencies?.sunpeak === 'workspace:*') {
    pkg.dependencies.sunpeak = sunpeakVersion;
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  // Update index.ts files based on selected resources
  updateIndexFiles(targetDir, selectedResources);

  console.log(`
Done! To get started:

  cd ${projectName}
  pnpm install
  pnpm dev

That's it! Your project commands:

  pnpm dev          # Start development server
  pnpm build        # Build for production
  pnpm mcp          # Start MCP server
  pnpm test         # Run tests

See README.md for more details.
`);
}

const [, , command, ...args] = process.argv;

/**
 * Parse arguments for resource commands (push, pull, deploy)
 */
function parseResourceArgs(args) {
  const options = { tags: [] };
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--repository' || arg === '-r') {
      options.repository = args[++i];
    } else if (arg === '--tag' || arg === '-t') {
      options.tags.push(args[++i]);
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('-')) {
      // Positional argument - treat as file path
      options.file = arg;
    }

    i++;
  }

  return options;
}

// Main CLI handler
(async () => {
  // Commands that don't require a package.json
  const standaloneCommands = [
    'new',
    'login',
    'logout',
    'push',
    'pull',
    'deploy',
    'help',
    undefined,
  ];

  if (command && !standaloneCommands.includes(command)) {
    checkPackageJson();
  }

  switch (command) {
    case 'new':
      await init(args[0], args[1]);
      break;

    case 'dev':
      {
        const { dev } = await import(join(COMMANDS_DIR, 'dev.mjs'));
        await dev(process.cwd(), args);
      }
      break;

    case 'build':
      {
        const { build } = await import(join(COMMANDS_DIR, 'build.mjs'));
        await build(process.cwd());
      }
      break;

    case 'mcp':
      {
        const { mcp } = await import(join(COMMANDS_DIR, 'mcp.mjs'));
        await mcp(process.cwd(), args);
      }
      break;

    case 'login':
      {
        const { login } = await import(join(COMMANDS_DIR, 'login.mjs'));
        await login();
      }
      break;

    case 'logout':
      {
        const { logout } = await import(join(COMMANDS_DIR, 'logout.mjs'));
        await logout();
      }
      break;

    case 'push':
      {
        const { push } = await import(join(COMMANDS_DIR, 'push.mjs'));
        await push(process.cwd(), parseResourceArgs(args));
      }
      break;

    case 'pull':
      {
        const { pull } = await import(join(COMMANDS_DIR, 'pull.mjs'));
        await pull(process.cwd(), parseResourceArgs(args));
      }
      break;

    case 'deploy':
      {
        const { deploy } = await import(join(COMMANDS_DIR, 'deploy.mjs'));
        await deploy(process.cwd(), parseResourceArgs(args));
      }
      break;

    case 'help':
    case undefined:
      console.log(`
☀️ 🏔️ sunpeak - The ChatGPT App framework

Usage:
  npx sunpeak new [name] [resources]   Create a new project (no install needed)
  pnpm dlx sunpeak new                  Alternative with pnpm

  Resources: albums, carousel, counter, map (comma/space separated)
  Example: npx sunpeak new my-app "albums,carousel"

Inside your project, use npm scripts:
  pnpm dev                 Start development server
  pnpm build               Build for production
  pnpm mcp                 Start MCP server
  pnpm test                Run tests

Direct CLI commands (when sunpeak is installed):
  sunpeak new [name] [resources]  Create a new project
  sunpeak dev              Start dev server
  sunpeak build            Build resources
  sunpeak mcp              Start MCP server
  sunpeak login            Log in to Sunpeak
  sunpeak logout           Log out of Sunpeak
  sunpeak push             Push resources to repository
  sunpeak pull             Pull resources from repository
  sunpeak deploy           Push resources with "prod" tag

For more information, visit: https://sunpeak.ai/
`);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "sunpeak help" to see available commands.');
      process.exit(1);
  }
})().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
