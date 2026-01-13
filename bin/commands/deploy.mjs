#!/usr/bin/env node
import { push, findResources, defaultDeps as pushDefaultDeps } from './push.mjs';

/**
 * Default dependencies (real implementations)
 */
export const defaultDeps = {
  ...pushDefaultDeps,
};

/**
 * Deploy command - same as push but with tag="prod"
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - Command options (same as push, but tag defaults to "prod")
 * @param {Object} deps - Dependencies (for testing). Uses defaultDeps if not provided.
 */
export async function deploy(projectRoot = process.cwd(), options = {}, deps = defaultDeps) {
  const d = { ...defaultDeps, ...deps };

  // Handle help flag
  if (options.help) {
    d.console.log(`
sunpeak deploy - Push resources to production (push with "prod" tag)

Usage:
  sunpeak deploy [directory] [options]

Options:
  -r, --repository <owner/repo>  Repository name (defaults to git remote origin)
  -t, --tag <name>               Additional tag(s) to assign (always includes "prod")
  -h, --help                     Show this help message

Arguments:
  directory                      Optional resource directory to deploy (e.g., dist/carousel)
                                 If not provided, looks for resources in current
                                 directory first, then falls back to dist/

Examples:
  sunpeak deploy                 Deploy all resources with "prod" tag
  sunpeak deploy dist/carousel   Deploy a single resource
  sunpeak deploy -r myorg/my-app Deploy to "myorg/my-app" repository
  sunpeak deploy -t v1.0         Deploy with "prod" and "v1.0" tags

This command is equivalent to: sunpeak push --tag prod
`);
    return;
  }

  // Always include "prod" tag, supplemented by any additional tags
  const additionalTags = options.tags?.filter((t) => t !== 'prod') ?? [];
  const deployOptions = {
    ...options,
    tags: ['prod', ...additionalTags],
  };

  d.console.log('Deploying to production...');
  d.console.log();

  // If no specific directory provided, check current directory first, then dist/
  if (!deployOptions.dir) {
    const cwdResources = findResources(projectRoot, d);
    if (cwdResources.length > 0) {
      // Found resources in current directory, push each one
      for (const resource of cwdResources) {
        await push(projectRoot, { ...deployOptions, dir: resource.dir }, d);
      }
      return;
    }
    // Fall back to dist/ directory (handled by push)
  }

  await push(projectRoot, deployOptions, d);
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = { tags: [] };
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--repository' || arg === '-r') {
      options.repository = args[++i];
    } else if (arg === '--tag' || arg === '-t') {
      options.tags.push(args[++i]);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
sunpeak deploy - Deploy resources to production (push with "prod" tag)

Usage:
  sunpeak deploy [directory] [options]

Options:
  -r, --repository <owner/repo>  Repository name (defaults to git remote origin)
  -t, --tag <name>               Additional tag(s) to assign (always includes "prod")
  -h, --help                     Show this help message

Arguments:
  directory                      Optional resource directory to deploy (e.g., dist/carousel)
                                 If not provided, looks for resources in current
                                 directory first, then falls back to dist/

Examples:
  sunpeak deploy                 Deploy all resources with "prod" tag
  sunpeak deploy dist/carousel   Deploy a single resource
  sunpeak deploy -r myorg/my-app Deploy to "myorg/my-app" repository
  sunpeak deploy -t v1.0         Deploy with "prod" and "v1.0" tags

This command is equivalent to: sunpeak push --tag prod
`);
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      // Positional argument - treat as directory path
      options.dir = arg;
    }

    i++;
  }

  return options;
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  deploy(process.cwd(), options).catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
