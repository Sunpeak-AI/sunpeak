#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

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
 * Default dependencies (real implementations)
 */
export const defaultDeps = {
  fetch: globalThis.fetch,
  loadCredentials: loadCredentialsImpl,
  existsSync,
  mkdirSync,
  writeFileSync,
  console,
  process,
  apiUrl: SUNPEAK_API_URL,
};

/**
 * Lookup resources by tag and repository
 * @returns {Promise<Array>} Array of matching resources
 */
async function lookupResources(tag, repository, accessToken, name = null, deps = defaultDeps) {
  const d = { ...defaultDeps, ...deps };

  const params = new URLSearchParams({ tag, repository });
  if (name) {
    params.set('name', name);
  }
  const response = await d.fetch(`${d.apiUrl}/api/v1/resources/lookup?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.resources;
}

/**
 * Download the HTML file for a resource
 */
async function downloadHtmlFile(resource, deps = defaultDeps) {
  const d = { ...defaultDeps, ...deps };

  if (!resource.html_file?.url) {
    throw new Error('Resource has no HTML file attached');
  }

  // The URL is a pre-signed S3 URL, no additional auth needed
  const response = await d.fetch(resource.html_file.url);

  if (!response.ok) {
    throw new Error(`Failed to download HTML file: HTTP ${response.status}`);
  }

  return response.text();
}

/**
 * Main pull command
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - Command options
 * @param {string} options.repository - Repository name in owner/repo format (required)
 * @param {string} options.tag - Tag name to pull (required)
 * @param {string} options.name - Resource name to filter by (optional)
 * @param {string} options.output - Output directory (optional, defaults to current directory)
 * @param {Object} deps - Dependencies (for testing). Uses defaultDeps if not provided.
 */
export async function pull(projectRoot = process.cwd(), options = {}, deps = defaultDeps) {
  const d = { ...defaultDeps, ...deps };

  // Handle help flag
  if (options.help) {
    d.console.log(`
sunpeak pull - Pull resources from the Sunpeak repository

Usage:
  sunpeak pull -r <owner/repo> -t <tag> [options]

Options:
  -r, --repository <owner/repo>  Repository name (required)
  -t, --tag <name>               Tag name to pull (required)
  -n, --name <name>              Resource name to filter by (optional)
  -o, --output <path>            Output directory (defaults to current directory)
  -h, --help                     Show this help message

Examples:
  sunpeak pull -r myorg/my-app -t prod             Pull all resources tagged "prod"
  sunpeak pull -r myorg/my-app -t prod -n review   Pull only the "review" resource
  sunpeak pull -r myorg/my-app -t v1.0.0           Pull a specific version
`);
    return;
  }

  // Check credentials
  const credentials = d.loadCredentials();
  if (!credentials?.access_token) {
    d.console.error('Error: Not logged in. Run "sunpeak login" first.');
    d.process.exit(1);
  }

  // Require repository
  if (!options.repository) {
    d.console.error('Error: Repository is required. Use --repository or -r to specify a repository.');
    d.console.error('Example: sunpeak pull -r myorg/my-app -t prod');
    d.process.exit(1);
  }

  // Require tag
  if (!options.tag) {
    d.console.error('Error: Tag is required. Use --tag or -t to specify a tag.');
    d.console.error('Example: sunpeak pull -r myorg/my-app -t prod');
    d.process.exit(1);
  }

  const repository = options.repository;

  const nameFilter = options.name ? ` with name "${options.name}"` : '';
  d.console.log(`Pulling resources from repository "${repository}" with tag "${options.tag}"${nameFilter}...`);
  d.console.log();

  try {
    // Lookup resources
    const resources = await lookupResources(options.tag, repository, credentials.access_token, options.name, d);

    if (!resources || resources.length === 0) {
      d.console.error('Error: No resources found matching the criteria.');
      d.process.exit(1);
    }

    d.console.log(`Found ${resources.length} resource(s):\n`);

    // Determine output directory
    const outputDir = options.output || projectRoot;

    // Create output directory if it doesn't exist
    if (!d.existsSync(outputDir)) {
      d.mkdirSync(outputDir, { recursive: true });
    }

    // Process each resource
    for (const resource of resources) {
      d.console.log(`Resource: ${resource.name}`);
      d.console.log(`  Title: ${resource.title}`);
      d.console.log(`  URI: ${resource.uri}`);
      d.console.log(`  Tags: ${resource.tags?.join(', ') || 'none'}`);
      d.console.log(`  Created: ${resource.created_at}`);

      if (!resource.html_file) {
        d.console.log(`  ⚠ Skipping: No HTML file attached.\n`);
        continue;
      }

      // Download the HTML file
      d.console.log(`  Downloading HTML file...`);
      const htmlContent = await downloadHtmlFile(resource, d);

      const outputFile = join(outputDir, `${resource.name}.html`);
      const metaFile = join(outputDir, `${resource.name}.json`);

      // Write the HTML file
      d.writeFileSync(outputFile, htmlContent);
      d.console.log(`  ✓ Saved ${resource.name}.html`);

      // Write metadata JSON
      const meta = {
        uri: resource.uri,
        name: resource.name,
        title: resource.title,
        description: resource.description,
        mimeType: resource.mime_type,
        _meta: {
          'openai/widgetDomain': resource.widget_domain,
          'openai/widgetCSP': {
            connect_domains: resource.widget_csp_connect_domains || [],
            resource_domains: resource.widget_csp_resource_domains || [],
          },
        },
      };
      d.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
      d.console.log(`  ✓ Saved ${resource.name}.json\n`);
    }

    d.console.log(`✓ Successfully pulled ${resources.length} resource(s) to ${outputDir}`);
  } catch (error) {
    d.console.error(`Error: ${error.message}`);
    d.process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
export function parseArgs(args) {
  const options = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--repository' || arg === '-r') {
      options.repository = args[++i];
    } else if (arg === '--tag' || arg === '-t') {
      options.tag = args[++i];
    } else if (arg === '--name' || arg === '-n') {
      options.name = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
sunpeak pull - Pull resources from the Sunpeak repository

Usage:
  sunpeak pull -r <owner/repo> -t <tag> [options]

Options:
  -r, --repository <owner/repo>  Repository name (required)
  -t, --tag <name>               Tag name to pull (required)
  -n, --name <name>              Resource name to filter by (optional)
  -o, --output <path>            Output directory (defaults to current directory)
  -h, --help                     Show this help message

Examples:
  sunpeak pull -r myorg/my-app -t prod             Pull all resources tagged "prod"
  sunpeak pull -r myorg/my-app -t prod -n review   Pull only the "review" resource
  sunpeak pull -r myorg/my-app -t v1.0.0           Pull a specific version
`);
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      // Positional argument - treat as tag
      if (!options.tag) {
        options.tag = arg;
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
  pull(process.cwd(), options).catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
