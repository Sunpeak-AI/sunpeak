#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
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
 * Lookup a resource by tag and repository
 */
async function lookupResource(tag, repository, accessToken) {
  const params = new URLSearchParams({ tag, repository });
  const response = await fetch(`${SUNPEAK_API_URL}/api/v1/resources/lookup?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Download the JS file for a resource
 */
async function downloadJsFile(resource) {
  if (!resource.js_file?.url) {
    throw new Error('Resource has no JS file attached');
  }

  // The URL is a pre-signed S3 URL, no additional auth needed
  const response = await fetch(resource.js_file.url);

  if (!response.ok) {
    throw new Error(`Failed to download JS file: HTTP ${response.status}`);
  }

  return response.text();
}

/**
 * Main pull command
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - Command options
 * @param {string} options.tag - Tag name to pull (required)
 * @param {string} options.repository - Repository name (optional, defaults to git repo name)
 * @param {string} options.output - Output directory (optional, defaults to dist)
 */
export async function pull(projectRoot = process.cwd(), options = {}) {
  // Handle help flag
  if (options.help) {
    console.log(`
sunpeak pull - Pull a resource from the Sunpeak repository

Usage:
  sunpeak pull -t <tag> [options]

Options:
  -t, --tag <name>               Tag name to pull (required)
  -r, --repository <owner/repo>  Repository name (defaults to git remote origin)
  -o, --output <path>            Output directory (defaults to current directory)
  -h, --help                     Show this help message

Examples:
  sunpeak pull -t prod                      Pull the "prod" tagged resource
  sunpeak pull -t v1.0.0                    Pull a specific version
  sunpeak pull -r myorg/my-app -t staging   Pull from "myorg/my-app" repository
`);
    return;
  }

  // Check credentials
  const credentials = loadCredentials();
  if (!credentials?.access_token) {
    console.error('Error: Not logged in. Run "sunpeak login" first.');
    process.exit(1);
  }

  // Require tag
  if (!options.tag) {
    console.error('Error: Tag is required. Use --tag or -t to specify a tag.');
    console.error('Example: sunpeak pull -t prod');
    process.exit(1);
  }

  // Determine repository name (owner/repo format)
  const repository = options.repository || getGitRepoName();
  if (!repository) {
    console.error('Error: Could not determine repository name.');
    console.error('Please provide a repository name: sunpeak pull --repository <owner/repo> --tag <tag>');
    console.error('Or run this command from within a git repository with a remote origin.');
    process.exit(1);
  }

  console.log(`Pulling resource from repository "${repository}" with tag "${options.tag}"...`);
  console.log();

  try {
    // Lookup the resource
    const resource = await lookupResource(options.tag, repository, credentials.access_token);

    console.log(`Found resource: ${resource.name}`);
    console.log(`  Title: ${resource.title}`);
    console.log(`  URI: ${resource.uri}`);
    console.log(`  Tags: ${resource.tags?.join(', ') || 'none'}`);
    console.log(`  Created: ${resource.created_at}`);

    if (!resource.js_file) {
      console.error('\nError: Resource has no JS file attached.');
      process.exit(1);
    }

    // Download the JS file
    console.log('\nDownloading JS file...');
    const jsContent = await downloadJsFile(resource);

    // Determine output directory and file
    const outputDir = options.output || projectRoot;
    const outputFile = join(outputDir, `${resource.name}.js`);
    const metaFile = join(outputDir, `${resource.name}.json`);

    // Create output directory if it doesn't exist
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Write the JS file
    writeFileSync(outputFile, jsContent);
    console.log(`✓ Saved ${resource.name}.js`);

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
    writeFileSync(metaFile, JSON.stringify(meta, null, 2));
    console.log(`✓ Saved ${resource.name}.json`);

    console.log(`\n✓ Successfully pulled resource to ${outputDir}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
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
    } else if (arg === '--tag' || arg === '-t') {
      options.tag = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
sunpeak pull - Pull a resource from the Sunpeak repository

Usage:
  sunpeak pull -t <tag> [options]

Options:
  -t, --tag <name>               Tag name to pull (required)
  -r, --repository <owner/repo>  Repository name (defaults to git remote origin)
  -o, --output <path>            Output directory (defaults to current directory)
  -h, --help                     Show this help message

Examples:
  sunpeak pull -t prod                      Pull the "prod" tagged resource
  sunpeak pull -t v1.0.0                    Pull a specific version
  sunpeak pull -r myorg/my-app -t staging   Pull from "myorg/my-app" repository
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
