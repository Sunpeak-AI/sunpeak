#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

const SUNPEAK_API_URL = process.env.SUNPEAK_API_URL || 'https://app.sunpeak.ai';
const CREDENTIALS_DIR = join(homedir(), '.sunpeak');
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, 'credentials.json');

/**
 * Load credentials from disk
 */
function loadCredentialsImpl() {
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
function getGitRepoNameImpl() {
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
 * Default dependencies (real implementations)
 */
export const defaultDeps = {
  fetch: globalThis.fetch,
  loadCredentials: loadCredentialsImpl,
  getGitRepoName: getGitRepoNameImpl,
  existsSync,
  readFileSync,
  readdirSync,
  console,
  process,
  apiUrl: SUNPEAK_API_URL,
};

/**
 * Find all resources in a directory
 * Returns array of { name, jsPath, metaPath, meta }
 */
export function findResources(distDir, deps = defaultDeps) {
  const d = { ...defaultDeps, ...deps };

  if (!d.existsSync(distDir)) {
    return [];
  }

  const files = d.readdirSync(distDir);
  const jsFiles = files.filter((f) => f.endsWith('.js'));
  const jsonFiles = new Set(files.filter((f) => f.endsWith('.json')));

  // Only include .js files that have a matching .json file
  return jsFiles
    .filter((jsFile) => {
      const name = jsFile.replace('.js', '');
      return jsonFiles.has(`${name}.json`);
    })
    .map((jsFile) => {
      const name = jsFile.replace('.js', '');
      const jsPath = join(distDir, jsFile);
      const metaPath = join(distDir, `${name}.json`);

      let meta = null;
      try {
        meta = JSON.parse(d.readFileSync(metaPath, 'utf-8'));
      } catch {
        d.console.warn(`Warning: Could not parse ${name}.json`);
      }

      return { name, jsPath, metaPath, meta };
    });
}

/**
 * Build a resource from a specific JS file path
 * Returns { name, jsPath, metaPath, meta }
 */
function buildResourceFromFile(jsPath, deps = defaultDeps) {
  const d = { ...defaultDeps, ...deps };

  if (!d.existsSync(jsPath)) {
    d.console.error(`Error: File not found: ${jsPath}`);
    d.process.exit(1);
  }

  // Extract name from filename (remove .js extension)
  const fileName = basename(jsPath);
  const name = fileName.replace('.js', '');

  // Look for .json in the same directory
  const dir = dirname(jsPath);
  const metaPath = join(dir, `${name}.json`);

  let meta = null;
  if (d.existsSync(metaPath)) {
    try {
      meta = JSON.parse(d.readFileSync(metaPath, 'utf-8'));
    } catch {
      d.console.warn(`Warning: Could not parse ${name}.json`);
    }
  }

  return { name, jsPath, metaPath, meta };
}

/**
 * Push a single resource to the API
 */
async function pushResource(resource, repository, tags, accessToken, deps = defaultDeps) {
  const d = { ...defaultDeps, ...deps };

  if (!resource.meta?.uri) {
    throw new Error('Resource is missing URI. Run "sunpeak build" to generate URIs.');
  }

  const jsContent = d.readFileSync(resource.jsPath);
  const jsBlob = new Blob([jsContent], { type: 'application/javascript' });

  // Build form data
  const formData = new FormData();
  formData.append('repository', repository);
  formData.append('js_file', jsBlob, `${resource.name}.js`);

  // Add metadata fields
  if (resource.meta) {
    formData.append('name', resource.meta.name || resource.name);
    formData.append('title', resource.meta.title || resource.name);
    if (resource.meta.description) {
      formData.append('description', resource.meta.description);
    }
    formData.append('mime_type', resource.meta.mimeType || 'text/html+skybridge');
    formData.append('uri', resource.meta.uri);

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
    formData.append('name', resource.name);
    formData.append('title', resource.name);
    formData.append('mime_type', 'text/html+skybridge');
  }

  // Add tags if provided
  if (tags && tags.length > 0) {
    tags.forEach((tag) => {
      formData.append('tags[]', tag);
    });
  }

  const response = await d.fetch(`${d.apiUrl}/api/v1/resources`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    let errorMessage = data.message || data.error || `HTTP ${response.status}`;
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      errorMessage += ': ' + data.errors.join(', ');
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Main push command
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - Command options
 * @param {string} options.repository - Repository name (optional, defaults to git repo name)
 * @param {string} options.file - Path to a specific resource JS file (optional)
 * @param {string[]} options.tags - Tags to assign to the pushed resources (optional)
 * @param {Object} deps - Dependencies (for testing). Uses defaultDeps if not provided.
 */
export async function push(projectRoot = process.cwd(), options = {}, deps = defaultDeps) {
  const d = { ...defaultDeps, ...deps };

  // Handle help flag
  if (options.help) {
    d.console.log(`
sunpeak push - Push resources to the Sunpeak repository

Usage:
  sunpeak push [file] [options]

Options:
  -r, --repository <owner/repo>  Repository name (defaults to git remote origin)
  -t, --tag <name>               Tag to assign (can be specified multiple times)
  -h, --help                     Show this help message

Arguments:
  file                           Optional JS file to push (e.g., dist/carousel.js)
                                 If not provided, pushes all resources from dist/

Examples:
  sunpeak push                       Push all resources from dist/
  sunpeak push dist/carousel.js      Push a single resource
  sunpeak push -r myorg/my-app       Push to "myorg/my-app" repository
  sunpeak push -t v1.0.0             Push with a version tag
  sunpeak push -t v1.0.0 -t prod     Push with multiple tags
`);
    return;
  }

  // Check credentials
  const credentials = d.loadCredentials();
  if (!credentials?.access_token) {
    d.console.error('Error: Not logged in. Run "sunpeak login" first.');
    d.process.exit(1);
  }

  // Determine repository name (owner/repo format)
  const repository = options.repository || d.getGitRepoName();
  if (!repository) {
    d.console.error('Error: Could not determine repository name.');
    d.console.error('Please provide a repository name: sunpeak push --repository <owner/repo>');
    d.console.error('Or run this command from within a git repository with a remote origin.');
    d.process.exit(1);
  }

  // Find resources - either a specific file or all from dist directory
  let resources;
  if (options.file) {
    // Push a single specific resource
    resources = [buildResourceFromFile(options.file, d)];
  } else {
    // Default: find all resources in dist directory
    const distDir = join(projectRoot, 'dist');
    if (!d.existsSync(distDir)) {
      d.console.error(`Error: dist/ directory not found`);
      d.console.error('Run "sunpeak build" first to build your resources.');
      d.process.exit(1);
    }

    resources = findResources(distDir, d);
    if (resources.length === 0) {
      d.console.error(`Error: No resources found in dist/`);
      d.console.error('Run "sunpeak build" first to build your resources.');
      d.process.exit(1);
    }
  }

  d.console.log(`Pushing ${resources.length} resource(s) to repository "${repository}"...`);
  if (options.tags && options.tags.length > 0) {
    d.console.log(`Tags: ${options.tags.join(', ')}`);
  }
  d.console.log();

  // Push each resource
  let successCount = 0;
  for (const resource of resources) {
    try {
      const result = await pushResource(resource, repository, options.tags, credentials.access_token, d);
      d.console.log(`✓ Pushed ${resource.name} (id: ${result.id})`);
      if (result.tags?.length > 0) {
        d.console.log(`  Tags: ${result.tags.join(', ')}`);
      }
      successCount++;
    } catch (error) {
      d.console.error(`✗ Failed to push ${resource.name}: ${error.message}`);
    }
  }

  d.console.log();
  if (successCount === resources.length) {
    d.console.log(`✓ Successfully pushed ${successCount} resource(s).`);
  } else {
    d.console.log(`Pushed ${successCount}/${resources.length} resource(s).`);
    d.process.exit(1);
  }
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
sunpeak push - Push resources to the Sunpeak repository

Usage:
  sunpeak push [file] [options]

Options:
  -r, --repository <owner/repo>  Repository name (defaults to git remote origin)
  -t, --tag <name>               Tag to assign (can be specified multiple times)
  -h, --help                     Show this help message

Arguments:
  file                           Optional JS file to push (e.g., dist/carousel.js)
                                 If not provided, pushes all resources from dist/

Examples:
  sunpeak push                       Push all resources from dist/
  sunpeak push dist/carousel.js      Push a single resource
  sunpeak push -r myorg/my-app       Push to "myorg/my-app" repository
  sunpeak push -t v1.0.0             Push with a version tag
  sunpeak push -t v1.0.0 -t prod     Push with multiple tags
`);
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      // Positional argument - treat as file path
      options.file = arg;
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
