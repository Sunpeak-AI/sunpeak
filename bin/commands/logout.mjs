#!/usr/bin/env node
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SUNPEAK_API_URL = process.env.SUNPEAK_API_URL || 'https://app.sunpeak.ai';
const CREDENTIALS_DIR = join(homedir(), '.sunpeak');
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, 'credentials.json');

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
 * Delete credentials file
 */
function deleteCredentials() {
  if (existsSync(CREDENTIALS_FILE)) {
    unlinkSync(CREDENTIALS_FILE);
  }
}

/**
 * Revoke the access token on the server
 */
async function revokeToken(accessToken) {
  try {
    const response = await fetch(`${SUNPEAK_API_URL}/oauth/revoke`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // 200 OK means success, but we also accept other success codes
    return response.ok;
  } catch {
    // Network error - token may still be valid on server
    // but we'll clean up locally anyway
    return false;
  }
}

/**
 * Main logout command
 */
export async function logout() {
  const credentials = loadCredentials();

  if (!credentials?.access_token) {
    console.log('Not logged in.');
    return;
  }

  console.log('Logging out...');

  // Revoke token on server
  const revoked = await revokeToken(credentials.access_token);

  // Always delete local credentials regardless of revocation result
  deleteCredentials();

  if (revoked) {
    console.log('✓ Successfully logged out of Sunpeak.');
  } else {
    console.log('✓ Logged out locally. (Server token revocation may have failed)');
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  logout().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
