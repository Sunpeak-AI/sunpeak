#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  cpSync,
  readFileSync,
  writeFileSync,
  renameSync,
  readdirSync,
} from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = join(__dirname, 'commands');

/**
 * Auto-discover available resources from template/src/resources directories.
 * Each subdirectory containing a {name}-resource.tsx file is a valid resource.
 */
function discoverResources() {
  const resourcesDir = join(__dirname, '..', 'template', 'src', 'resources');
  if (!existsSync(resourcesDir)) {
    return [];
  }
  return readdirSync(resourcesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => {
      const resourceFile = join(resourcesDir, entry.name, `${entry.name}-resource.tsx`);
      return existsSync(resourceFile);
    })
    .map((entry) => entry.name);
}

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

function parseResourcesInput(input, validResources) {
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
    console.error(`Error: Invalid resource(s): ${invalid.join(', ')}`);
    console.error(`Valid resources are: ${validResources.join(', ')}`);
    process.exit(1);
  }

  // Remove duplicates
  return [...new Set(tokens)];
}

async function init(projectName, resourcesArg) {
  // Discover available resources from template
  const availableResources = discoverResources();
  if (availableResources.length === 0) {
    console.error('Error: No resources found in template/src/resources/');
    process.exit(1);
  }

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
      `☀️ 🏔️ Resources (UIs) to include [${availableResources.join(', ')}]: `
    );
  }
  const selectedResources = parseResourcesInput(resourcesInput, availableResources);

  const targetDir = join(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    console.error(`Error: Directory "${projectName}" already exists`);
    process.exit(1);
  }

  const templateDir = join(__dirname, '..', 'template');

  console.log(`☀️ 🏔️ Creating ${projectName}...`);

  mkdirSync(targetDir, { recursive: true });

  // Filter resource directories based on selection
  const excludedResources = availableResources.filter((r) => !selectedResources.includes(r));

  cpSync(templateDir, targetDir, {
    recursive: true,
    filter: (src) => {
      const name = basename(src);

      // Skip node_modules and lock file
      if (name === 'node_modules' || name === 'pnpm-lock.yaml') {
        return false;
      }

      for (const resource of excludedResources) {
        // Skip entire resource directory: src/resources/{resource}/
        if (src.includes('/resources/') && name === resource) {
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

  console.log(`
Done! To get started:

  cd ${projectName}
  pnpm install
  sunpeak dev

That's it! Your project commands:

  sunpeak dev       # Start dev server + MCP endpoint
  sunpeak build     # Build for production
  pnpm test         # Run tests

See README.md for more details.
`);
}

const [, , command, ...args] = process.argv;

/**
 * Get the sunpeak version from package.json
 */
function getVersion() {
  const pkgPath = join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  return pkg.version;
}

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
    } else if (arg === '--name' || arg === '-n') {
      options.name = args[++i];
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

  // Set singular tag for commands that expect it (e.g., pull)
  options.tag = options.tags[0];

  return options;
}

// Main CLI handler
(async () => {
  // Handle --version / -v flags early
  if (command === '--version' || command === '-v' || command === 'version') {
    console.log(getVersion());
    process.exit(0);
  }

  // Commands that don't require a package.json
  const standaloneCommands = [
    'new',
    'login',
    'logout',
    'push',
    'pull',
    'deploy',
    'upgrade',
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

    case 'upgrade':
      {
        const { upgrade } = await import(join(COMMANDS_DIR, 'upgrade.mjs'));
        const options = {
          check: args.includes('--check') || args.includes('-c'),
          help: args.includes('--help') || args.includes('-h'),
        };
        await upgrade(options);
      }
      break;

    case 'help':
    case undefined:
      {
        const resources = discoverResources();
        console.log(`
☀️ 🏔️ sunpeak - The ChatGPT App framework

Install:
  pnpm add -g sunpeak

Usage:
  sunpeak new [name] [resources]  Create a new project
  sunpeak dev              Start dev server + MCP endpoint
  sunpeak build            Build resources
  sunpeak login            Log in to Sunpeak
  sunpeak logout           Log out of Sunpeak
  sunpeak push             Push resources to repository
  sunpeak pull             Pull resources from repository
  sunpeak deploy           Push resources with "prod" tag
  sunpeak upgrade          Upgrade sunpeak to latest version
  sunpeak --version        Show version number

  Resources: ${resources.join(', ')} (comma/space separated)
  Example: sunpeak new my-app "${resources.slice(0, 2).join(',')}"

For more information, visit: https://sunpeak.ai/
`);
      }
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
