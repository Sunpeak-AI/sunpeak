#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

const SUNPEAK_API_URL = process.env.SUNPEAK_API_URL || 'https://app.sunpeak.ai';
const CREDENTIALS_DIR = join(homedir(), '.sunpeak');
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, 'credentials.json');

/**
 * Load credentials from disk
 */
function loadCredentials() {
  if (!existsSync(CREDENTIALS_FILE)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Get the current git repository name in owner/repo format
 */
function getGitRepoName() {
  try {
    // Try to get the remote URL first
    const remoteUrl = execSync('git remote get-url origin 2>/dev/null', { encoding: 'utf-8' }).trim();
    if (remoteUrl) {
      // Extract owner/repo from URL
      // Handles: https://github.com/owner/repo.git, git@github.com:owner/repo.git
      const match = remoteUrl.match(/[/:]([^/:]+\/[^/]+?)(?:\.git)?$/);
      if (match) {
        return match[1];
      }
    }
  } catch {
    // No remote
  }

  return null;
}

/**
 * Find all resources in the dist folder
 * Returns array of { name, jsPath, metaPath, meta }
 */
function findResources(distDir) {
  if (!existsSync(distDir)) {
    return [];
  }

  const files = readdirSync(distDir);
  const jsFiles = files.filter((f) => f.endsWith('.js') && !f.endsWith('.meta.js'));

  return jsFiles.map((jsFile) => {
    const name = jsFile.replace('.js', '');
    const jsPath = join(distDir, jsFile);
    const metaPath = join(distDir, `${name}.meta.json`);

    let meta = null;
    if (existsSync(metaPath)) {
      try {
        meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
      } catch {
        console.warn(`Warning: Could not parse ${name}.meta.json`);
      }
    }

    return { name, jsPath, metaPath, meta };
  });
}

/**
 * Push a single resource to the API
 */
async function pushResource(resource, repository, tag, accessToken) {
  const jsContent = readFileSync(resource.jsPath);
  const jsBlob = new Blob([jsContent], { type: 'application/javascript' });

  // Build form data
  const formData = new FormData();
  formData.append('repository', repository);
  formData.append('js_file', jsBlob, `${resource.name}.js`);

  // Add metadata fields
  if (resource.meta) {
    formData.append('uri', resource.meta.uri || `ui://${resource.name}`);
    formData.append('name', resource.meta.name || resource.name);
    formData.append('title', resource.meta.title || resource.name);
    if (resource.meta.description) {
      formData.append('description', resource.meta.description);
    }
    formData.append('mime_type', resource.meta.mimeType || 'text/html+skybridge');

    // Handle OpenAI widget metadata
    if (resource.meta._meta) {
      if (resource.meta._meta['openai/widgetDomain']) {
        formData.append('widget_domain', resource.meta._meta['openai/widgetDomain']);
      }
      if (resource.meta._meta['openai/widgetCSP']) {
        const csp = resource.meta._meta['openai/widgetCSP'];
        if (csp.connect_domains) {
          csp.connect_domains.forEach((domain) => {
            formData.append('widget_csp_connect_domains[]', domain);
          });
        }
        if (csp.resource_domains) {
          csp.resource_domains.forEach((domain) => {
            formData.append('widget_csp_resource_domains[]', domain);
          });
        }
      }
    }
  } else {
    // Fallback metadata
    formData.append('uri', `ui://${resource.name}`);
    formData.append('name', resource.name);
    formData.append('title', resource.name);
    formData.append('mime_type', 'text/html+skybridge');
  }

  // Add tag if provided
  if (tag) {
    formData.append('tag', tag);
  }

  const response = await fetch(`${SUNPEAK_API_URL}/api/v1/resources`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Main push command
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - Command options
 * @param {string} options.repository - Repository name (optional, defaults to git repo name)
 * @param {string} options.distDir - Distribution directory (optional, defaults to dist/chatgpt)
 * @param {string} options.tag - Tag name (optional)
 */
export async function push(projectRoot = process.cwd(), options = {}) {
  // Handle help flag
  if (options.help) {
    console.log(`
sunpeak push - Push resources to the Sunpeak repository

Usage:
  sunpeak push [options]

Options:
  -r, --repository <owner/repo>  Repository name (defaults to git remote origin)
  -d, --dist <path>              Distribution directory (defaults to dist/chatgpt)
  -t, --tag <name>               Tag to assign to the pushed resources
  -h, --help                     Show this help message

Examples:
  sunpeak push                              Push using defaults
  sunpeak push -r myorg/my-app              Push to "myorg/my-app" repository
  sunpeak push -t v1.0.0                    Push with a version tag
  sunpeak push -r myorg/my-app -t staging   Push with "staging" tag
`);
    return;
  }

  // Check credentials
  const credentials = loadCredentials();
  if (!credentials?.access_token) {
    console.error('Error: Not logged in. Run "sunpeak login" first.');
    process.exit(1);
  }

  // Determine repository name (owner/repo format)
  const repository = options.repository || getGitRepoName();
  if (!repository) {
    console.error('Error: Could not determine repository name.');
    console.error('Please provide a repository name: sunpeak push --repository <owner/repo>');
    console.error('Or run this command from within a git repository with a remote origin.');
    process.exit(1);
  }

  // Determine dist directory
  const distDir = options.distDir || join(projectRoot, 'dist/chatgpt');
  if (!existsSync(distDir)) {
    console.error(`Error: Distribution directory not found: ${distDir}`);
    console.error('Run "sunpeak build" first to build your resources.');
    process.exit(1);
  }

  // Find resources
  const resources = findResources(distDir);
  if (resources.length === 0) {
    console.error(`Error: No resources found in ${distDir}`);
    console.error('Run "sunpeak build" first to build your resources.');
    process.exit(1);
  }

  console.log(`Pushing ${resources.length} resource(s) to repository "${repository}"...`);
  if (options.tag) {
    console.log(`Tag: ${options.tag}`);
  }
  console.log();

  // Push each resource
  let successCount = 0;
  for (const resource of resources) {
    try {
      const result = await pushResource(resource, repository, options.tag, credentials.access_token);
      console.log(`✓ Pushed ${resource.name} (id: ${result.id})`);
      if (result.tags?.length > 0) {
        console.log(`  Tags: ${result.tags.join(', ')}`);
      }
      successCount++;
    } catch (error) {
      console.error(`✗ Failed to push ${resource.name}: ${error.message}`);
    }
  }

  console.log();
  if (successCount === resources.length) {
    console.log(`✓ Successfully pushed ${successCount} resource(s).`);
  } else {
    console.log(`Pushed ${successCount}/${resources.length} resource(s).`);
    process.exit(1);
  }
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
sunpeak push - Push resources to the Sunpeak repository

Usage:
  sunpeak push [options]

Options:
  -r, --repository <owner/repo>  Repository name (defaults to git remote origin)
  -d, --dist <path>              Distribution directory (defaults to dist/chatgpt)
  -t, --tag <name>               Tag to assign to the pushed resources
  -h, --help                     Show this help message

Examples:
  sunpeak push                              Push using defaults
  sunpeak push -r myorg/my-app              Push to "myorg/my-app" repository
  sunpeak push -t v1.0.0                    Push with a version tag
  sunpeak push -r myorg/my-app -t staging   Push with "staging" tag
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
  push(process.cwd(), options).catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
