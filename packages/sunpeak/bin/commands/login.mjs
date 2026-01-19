#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import { exec } from 'child_process';

const SUNPEAK_API_URL = process.env.SUNPEAK_API_URL || 'https://app.sunpeak.ai';
const CREDENTIALS_DIR = join(homedir(), '.sunpeak');
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, 'credentials.json');

// Polling configuration
const POLL_INTERVAL_MS = 2500; // 2.5 seconds between polls.
const MAX_POLL_DURATION_MS = 2 * 60 * 1000; // 2 minutes max.

/**
 * Load existing credentials if present
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
 * Save credentials to disk
 */
function saveCredentialsImpl(credentials) {
  if (!existsSync(CREDENTIALS_DIR)) {
    mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  }
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), { mode: 0o600 });
}

/**
 * Open a URL in the default browser
 * Returns true if successful, false otherwise
 */
function openBrowserImpl(url) {
  return new Promise((resolve) => {
    const os = platform();
    let command;

    // Platform-specific commands to open URLs
    if (os === 'darwin') {
      command = `open "${url}"`;
    } else if (os === 'win32') {
      command = `start "" "${url}"`;
    } else {
      // Linux and other Unix-like systems
      command = `xdg-open "${url}"`;
    }

    exec(command, (error) => {
      resolve(!error);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Default dependencies (real implementations)
 */
export const defaultDeps = {
  fetch: globalThis.fetch,
  loadCredentials: loadCredentialsImpl,
  saveCredentials: saveCredentialsImpl,
  openBrowser: openBrowserImpl,
  console,
  sleep,
  apiUrl: SUNPEAK_API_URL,
  pollIntervalMs: POLL_INTERVAL_MS,
  maxPollDurationMs: MAX_POLL_DURATION_MS,
};

/**
 * Request a device code from the authorization server
 */
async function requestDeviceCode(deps) {
  const response = await deps.fetch(`${deps.apiUrl}/oauth/device_authorization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to request device code: ${response.status} ${text}`);
  }

  return response.json();
}

/**
 * Poll for the access token
 */
async function pollForToken(deviceCode, deps) {
  const startTime = Date.now();

  while (Date.now() - startTime < deps.maxPollDurationMs) {
    let response;
    try {
      response = await deps.fetch(`${deps.apiUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode,
        }),
      });
    } catch (err) {
      // Network error - wait and retry
      await deps.sleep(deps.pollIntervalMs);
      continue;
    }

    let data;
    let responseText;
    try {
      responseText = await response.text();
      data = JSON.parse(responseText);
    } catch {
      // Non-JSON response - this is unexpected, throw with details
      throw new Error(
        `Server returned unexpected response (${response.status}): ${responseText?.slice(0, 200) || 'empty response'}`
      );
    }

    if (response.ok && data.access_token) {
      return data;
    }

    // Handle standard OAuth 2.0 device flow errors (expected during polling)
    if (data.error === 'authorization_pending') {
      // User hasn't authorized yet, keep polling
      await deps.sleep(deps.pollIntervalMs);
      continue;
    }

    if (data.error === 'slow_down') {
      // Server asking us to slow down, increase interval
      await deps.sleep(deps.pollIntervalMs * 2);
      continue;
    }

    if (data.error === 'access_denied') {
      throw new Error('Authorization denied by user');
    }

    if (data.error === 'expired_token') {
      throw new Error('Device code expired. Please try again.');
    }

    // If response was OK but no access_token, something is wrong with the response
    if (response.ok) {
      throw new Error('Invalid token response from server');
    }

    // Unknown error - include status code for debugging
    const errorMessage = data.error_description || data.error || 'Unknown error';
    throw new Error(`Authorization failed (${response.status}): ${errorMessage}`);
  }

  throw new Error('Authorization timed out. Please try again.');
}

/**
 * Main login command
 * @param {Object} deps - Dependencies (for testing). Uses defaultDeps if not provided.
 */
export async function login(deps = defaultDeps) {
  const d = { ...defaultDeps, ...deps };

  // Check if already logged in
  const existing = d.loadCredentials();
  if (existing?.access_token) {
    d.console.log('Already logged in. Run "sunpeak logout" first to switch accounts.');
    return;
  }

  d.console.log('Starting device authorization flow...\n');

  // Step 1: Request device code
  const deviceAuth = await requestDeviceCode(d);

  // Step 2: Open browser and display instructions
  // Prefer verification_uri_complete which has the code pre-filled
  const authUrl =
    deviceAuth.verification_uri_complete ||
    `${deviceAuth.verification_uri}?user_code=${encodeURIComponent(deviceAuth.user_code)}`;

  const browserOpened = await d.openBrowser(authUrl);

  if (browserOpened) {
    d.console.log('Opening browser for authentication...\n');
    d.console.log(`If the browser didn't open, visit: ${deviceAuth.verification_uri}`);
    d.console.log(`And enter code: ${deviceAuth.user_code}`);
  } else {
    d.console.log('To complete login, please:');
    d.console.log(`  1. Visit: ${deviceAuth.verification_uri}`);
    d.console.log(`  2. Enter code: ${deviceAuth.user_code}`);
  }
  d.console.log('\nWaiting for authorization...');

  // Step 3: Poll for token
  const tokenResponse = await pollForToken(deviceAuth.device_code, d);

  // Step 4: Save credentials
  const credentials = {
    access_token: tokenResponse.access_token,
    token_type: tokenResponse.token_type || 'Bearer',
    expires_at: tokenResponse.expires_in
      ? Date.now() + tokenResponse.expires_in * 1000
      : null,
    created_at: Date.now(),
  };

  d.saveCredentials(credentials);

  d.console.log('\n✓ Successfully logged in to Sunpeak!');
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  login().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
