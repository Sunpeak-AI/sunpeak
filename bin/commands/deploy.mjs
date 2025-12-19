#!/usr/bin/env node
import { push } from './push.mjs';

/**
 * Deploy command - same as push but with tag="prod"
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - Command options (same as push, but tag defaults to "prod")
 */
export async function deploy(projectRoot = process.cwd(), options = {}) {
  // Handle help flag
  if (options.help) {
    console.log(`
sunpeak deploy - Deploy resources to production (push with "prod" tag)

Usage:
  sunpeak deploy [options]

Options:
  -r, --repository <owner/repo>  Repository name (defaults to git remote origin)
  -d, --dist <path>              Distribution directory (defaults to dist/chatgpt)
  -t, --tag <name>               Tag to assign (defaults to "prod")
  -h, --help                     Show this help message

Examples:
  sunpeak deploy                         Deploy with "prod" tag
  sunpeak deploy -r myorg/my-app         Deploy to "myorg/my-app" repository
  sunpeak deploy -t production           Deploy with custom tag

This command is equivalent to: sunpeak push --tag prod
`);
    return;
  }

  // Default tag to "prod" for deploy
  const deployOptions = {
    ...options,
    tag: options.tag || 'prod',
  };

  console.log('Deploying to production...');
  console.log();

  await push(projectRoot, deployOptions);
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--repository' || arg === '-r') {
      options.repository = args[++i];
    } else if (arg === '--dist' || arg === '-d') {
      options.distDir = args[++i];
    } else if (arg === '--tag' || arg === '-t') {
      options.tag = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
sunpeak deploy - Deploy resources to production (push with "prod" tag)

Usage:
  sunpeak deploy [options]

Options:
  -r, --repository <owner/repo>  Repository name (defaults to git remote origin)
  -d, --dist <path>              Distribution directory (defaults to dist/chatgpt)
  -t, --tag <name>               Tag to assign (defaults to "prod")
  -h, --help                     Show this help message

Examples:
  sunpeak deploy                         Deploy with "prod" tag
  sunpeak deploy -r myorg/my-app         Deploy to "myorg/my-app" repository
  sunpeak deploy -t production           Deploy with custom tag

This command is equivalent to: sunpeak push --tag prod
`);
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      // Positional argument - treat as repository name
      if (!options.repository) {
        options.repository = arg;
      }
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
