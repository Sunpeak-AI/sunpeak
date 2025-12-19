#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import { exec } from 'child_process';

const SUNPEAK_API_URL = process.env.SUNPEAK_API_URL || 'https://app.sunpeak.ai';
const CREDENTIALS_DIR = join(homedir(), '.sunpeak');
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, 'credentials.json');

// Polling configuration
const POLL_INTERVAL_MS = 2000; // 2 seconds between polls.
const MAX_POLL_DURATION_MS = 2 * 60 * 1000; // 2 minutes max.

/**
 * Load existing credentials if present
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
 * Save credentials to disk
 */
function saveCredentials(credentials) {
  if (!existsSync(CREDENTIALS_DIR)) {
    mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  }
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), { mode: 0o600 });
}

/**
 * Request a device code from the authorization server
 */
async function requestDeviceCode() {
  const response = await fetch(`${SUNPEAK_API_URL}/oauth/device_authorization`, {
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
async function pollForToken(deviceCode) {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
    const response = await fetch(`${SUNPEAK_API_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode,
      }),
    });

    if (response.ok) {
      return response.json();
    }

    const data = await response.json().catch(() => ({}));

    // Handle standard OAuth 2.0 device flow errors
    if (data.error === 'authorization_pending') {
      // User hasn't authorized yet, keep polling
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (data.error === 'slow_down') {
      // Server asking us to slow down, increase interval
      await sleep(POLL_INTERVAL_MS * 2);
      continue;
    }

    if (data.error === 'access_denied') {
      throw new Error('Authorization denied by user');
    }

    if (data.error === 'expired_token') {
      throw new Error('Device code expired. Please try again.');
    }

    // Unknown error
    throw new Error(data.error_description || data.error || 'Authorization failed');
  }

  throw new Error('Authorization timed out. Please try again.');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Open a URL in the default browser
 * Returns true if successful, false otherwise
 */
function openBrowser(url) {
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

/**
 * Main login command
 */
export async function login() {
  // Check if already logged in
  const existing = loadCredentials();
  if (existing?.access_token) {
    console.log('Already logged in. Run "sunpeak logout" first to switch accounts.');
    return;
  }

  console.log('Starting device authorization flow...\n');

  // Step 1: Request device code
  const deviceAuth = await requestDeviceCode();

  // Step 2: Open browser and display instructions
  // Prefer verification_uri_complete which has the code pre-filled
  const authUrl =
    deviceAuth.verification_uri_complete ||
    `${deviceAuth.verification_uri}?user_code=${encodeURIComponent(deviceAuth.user_code)}`;

  const browserOpened = await openBrowser(authUrl);

  if (browserOpened) {
    console.log('Opening browser for authentication...\n');
    console.log(`If the browser didn't open, visit: ${deviceAuth.verification_uri}`);
    console.log(`And enter code: ${deviceAuth.user_code}`);
  } else {
    console.log('To complete login, please:');
    console.log(`  1. Visit: ${deviceAuth.verification_uri}`);
    console.log(`  2. Enter code: ${deviceAuth.user_code}`);
  }
  console.log('\nWaiting for authorization...');

  // Step 3: Poll for token
  const tokenResponse = await pollForToken(deviceAuth.device_code);

  // Step 4: Save credentials
  const credentials = {
    access_token: tokenResponse.access_token,
    token_type: tokenResponse.token_type || 'Bearer',
    expires_at: tokenResponse.expires_in
      ? Date.now() + tokenResponse.expires_in * 1000
      : null,
    created_at: Date.now(),
  };

  saveCredentials(credentials);

  console.log('\n✓ Successfully logged in to Sunpeak!');
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  login().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
