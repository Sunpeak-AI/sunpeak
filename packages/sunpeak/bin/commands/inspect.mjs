/**
 * `sunpeak inspect` — Connect to an external MCP server and launch the inspector.
 *
 * This command lets users test their own MCP server in the sunpeak inspector
 * without adopting the sunpeak framework conventions. It connects to the server
 * via MCP protocol, discovers tools and resources, and serves the inspector UI.
 *
 * The core logic lives in `inspectServer()`, which is also used by `sunpeak dev`
 * to serve the inspector UI pointed at the local MCP server.
 *
 * Usage:
 *   sunpeak inspect --server http://localhost:8000/mcp
 *   sunpeak inspect --server "python my_server.py"
 *   sunpeak inspect --server http://localhost:8000/mcp --simulations tests/simulations
 */
import * as fs from 'fs';
import * as path from 'path';
const { existsSync, readdirSync, readFileSync } = fs;
const { join, resolve, dirname } = path;
import { fileURLToPath, pathToFileURL } from 'url';
import { getPort } from '../lib/get-port.mjs';
import { startSandboxServer } from '../lib/sandbox-server.mjs';
import { getDevOverlayScript } from '../lib/dev-overlay.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUNPEAK_PKG_DIR = resolve(__dirname, '..', '..');

/**
 * Parse CLI arguments.
 * @param {string[]} args
 */
function parseArgs(args) {
  const opts = {
    server: undefined,
    simulations: undefined,
    port: undefined,
    name: undefined,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--server' || arg === '-s') && i + 1 < args.length) {
      opts.server = args[++i];
    } else if (arg === '--simulations' && i + 1 < args.length) {
      opts.simulations = args[++i];
    } else if ((arg === '--port' || arg === '-p') && i + 1 < args.length) {
      opts.port = Number(args[++i]);
    } else if (arg === '--name' && i + 1 < args.length) {
      opts.name = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return opts;
}

function printHelp() {
  console.log(`
sunpeak inspect — Test an external MCP server in the inspector

Usage:
  sunpeak inspect --server <url-or-command>

Options:
  --server, -s <url|cmd>     MCP server URL or stdio command (required)
  --simulations <dir>        Simulation JSON directory (opt-in, no default)
  --port, -p <number>        Dev server port (default: 3000)
  --name <string>            App name in inspector chrome
  --help, -h                 Show this help

Examples:
  sunpeak inspect --server http://localhost:8000/mcp
  sunpeak inspect --server "python my_server.py"
  sunpeak inspect --server http://localhost:8000/mcp --simulations tests/simulations
`);
}

/**
 * Create an in-memory OAuth client provider for the inspector.
 * The provider stores tokens, client info, and code verifier in memory.
 * When `redirectToAuthorization()` is called, it stores the URL for retrieval.
 *
 * @param {string} redirectUrl - The callback URL for OAuth redirects
 * @param {{ clientId?: string, clientSecret?: string }} [opts]
 * @returns {{ provider: import('@modelcontextprotocol/sdk/client/auth.js').OAuthClientProvider, getAuthUrl: () => URL | undefined }}
 */
function createInMemoryOAuthProvider(redirectUrl, opts = {}) {
  let _tokens;
  let _clientInfo;
  let _codeVerifier;
  let _authUrl;
  let _discoveryState;
  // Cryptographic state parameter for CSRF protection on the OAuth callback.
  const _stateParam = crypto.randomUUID();

  // If pre-registered client credentials were provided, seed the client info
  // so the SDK skips dynamic client registration.
  if (opts.clientId) {
    _clientInfo = {
      client_id: opts.clientId,
      ...(opts.clientSecret ? { client_secret: opts.clientSecret } : {}),
    };
  }

  const provider = {
    get redirectUrl() {
      return redirectUrl;
    },
    get clientMetadata() {
      return {
        redirect_uris: [new URL(redirectUrl)],
        client_name: 'sunpeak Inspector',
        token_endpoint_auth_method: opts.clientSecret ? 'client_secret_post' : 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      };
    },
    // Return the state parameter so the SDK includes it in the authorization URL.
    state() {
      return _stateParam;
    },
    clientInformation() {
      return _clientInfo;
    },
    saveClientInformation(info) {
      _clientInfo = info;
    },
    tokens() {
      return _tokens;
    },
    saveTokens(tokens) {
      _tokens = tokens;
    },
    redirectToAuthorization(url) {
      _authUrl = url;
    },
    saveCodeVerifier(verifier) {
      _codeVerifier = verifier;
    },
    codeVerifier() {
      return _codeVerifier;
    },
    // Cache discovery state so the second auth() call (token exchange)
    // doesn't re-discover metadata from scratch.
    saveDiscoveryState(state) {
      _discoveryState = state;
    },
    discoveryState() {
      return _discoveryState;
    },
  };

  return {
    provider,
    getAuthUrl: () => _authUrl,
    hasTokens: () => !!_tokens,
    stateParam: _stateParam,
  };
}

/**
 * Create an MCP client connection.
 * @param {string} serverArg - URL or command string
 * @param {{ type?: 'none' | 'bearer' | 'oauth', bearerToken?: string, authProvider?: import('@modelcontextprotocol/sdk/client/auth.js').OAuthClientProvider }} [authConfig]
 * @returns {Promise<{ client: import('@modelcontextprotocol/sdk/client/index.js').Client, transport: import('@modelcontextprotocol/sdk/types.js').Transport }>}
 */
async function createMcpConnection(serverArg, authConfig) {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const client = new Client({ name: 'sunpeak-inspector', version: '1.0.0' });

  if (serverArg.startsWith('http://') || serverArg.startsWith('https://')) {
    // HTTP/SSE transport
    const { StreamableHTTPClientTransport } = await import(
      '@modelcontextprotocol/sdk/client/streamableHttp.js'
    );

    const transportOpts = {};

    if (authConfig?.type === 'bearer' && authConfig.bearerToken) {
      transportOpts.requestInit = {
        headers: { Authorization: `Bearer ${authConfig.bearerToken}` },
      };
    } else if (authConfig?.type === 'oauth' && authConfig.authProvider) {
      transportOpts.authProvider = authConfig.authProvider;
    }

    const transport = new StreamableHTTPClientTransport(new URL(serverArg), transportOpts);
    await client.connect(transport);
    return { client, transport };
  } else {
    // Stdio transport — parse command string
    const parts = serverArg.split(/\s+/);
    const command = parts[0];
    const cmdArgs = parts.slice(1);
    const { StdioClientTransport } = await import(
      '@modelcontextprotocol/sdk/client/stdio.js'
    );
    const transport = new StdioClientTransport({ command, args: cmdArgs });
    await client.connect(transport);
    return { client, transport };
  }
}

/**
 * Discover tools and resources from the MCP server and build Simulation objects.
 * @param {import('@modelcontextprotocol/sdk/client/index.js').Client} client
 * @returns {Promise<Record<string, object>>} Map of simulation name → Simulation-shaped objects
 */
async function discoverSimulations(client) {
  const { tools } = await client.listTools();

  // Try to list resources (server may not support them)
  let resources = [];
  try {
    const result = await client.listResources();
    resources = result.resources || [];
  } catch {
    // Server doesn't support resources — that's fine
  }

  // Build resource URI map
  const resourceByUri = new Map();
  for (const resource of resources) {
    resourceByUri.set(resource.uri, resource);
  }

  const simulations = {};

  for (const tool of tools) {
    const simName = tool.name;

    // Match tool to resource via _meta.ui.resourceUri (MCP Apps extension).
    // Supports both nested format (_meta.ui.resourceUri) and deprecated flat
    // format (_meta["ui/resourceUri"]).
    let resource;
    let resourceUrl;
    const uri = tool._meta?.ui?.resourceUri ?? tool._meta?.['ui/resourceUri'];
    if (uri) {
      resource = resourceByUri.get(uri);
      if (resource) {
        resourceUrl = `/__sunpeak/read-resource?uri=${encodeURIComponent(uri)}`;
      }
    }

    simulations[simName] = {
      name: simName,
      tool,
      resource,
      resourceUrl,
    };
  }

  return simulations;
}

/**
 * Load simulation JSON fixtures from a directory and merge into discovered simulations.
 * @param {string} dir - Simulation directory path
 * @param {Record<string, object>} simulations - Discovered simulations to merge into
 */
function mergeSimulationFixtures(dir, simulations) {
  if (!existsSync(dir)) return;

  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    try {
      const fixture = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
      const toolName = fixture.tool;
      if (!toolName) continue;

      // Find matching simulation by tool name
      const sim = simulations[toolName];
      if (sim) {
        // Merge fixture data into discovered simulation
        if (fixture.toolInput !== undefined) sim.toolInput = fixture.toolInput;
        if (fixture.toolResult !== undefined) sim.toolResult = fixture.toolResult;
        if (fixture.serverTools !== undefined) sim.serverTools = fixture.serverTools;
        if (fixture.userMessage !== undefined) sim.userMessage = fixture.userMessage;
        if (fixture.hostContext !== undefined) sim.hostContext = fixture.hostContext;
      } else {
        // Create a new simulation from the fixture (tool not on server, but user wants to mock it)
        const simName = file.replace(/\.json$/, '');
        simulations[simName] = {
          name: simName,
          tool: { name: toolName, inputSchema: { type: 'object' } },
          toolInput: fixture.toolInput,
          toolResult: fixture.toolResult,
          serverTools: fixture.serverTools,
          userMessage: fixture.userMessage,
          hostContext: fixture.hostContext,
        };
      }
    } catch (err) {
      console.warn(`Warning: Failed to parse simulation fixture ${file}:`, err.message);
    }
  }
}

/**
 * Vite plugin that serves virtual modules for the inspect entry point.
 *
 * @param {Record<string, object>} simulations - Simulation objects
 * @param {string} serverUrl - MCP server URL
 * @param {string} appName - Display name
 * @param {string|null} appIcon - Icon URL or emoji
 * @param {string} sandboxUrl - Sandbox server URL
 * @param {{ defaultProdResources?: boolean, hideInspectorModes?: boolean }} [modeFlags] - Mode toggles
 */
function sunpeakInspectVirtualPlugin(simulations, serverUrl, appName, appIcon, sandboxUrl, modeFlags = {}) {
  const ENTRY_ID = 'virtual:sunpeak-inspect-entry';
  const RESOLVED_ENTRY_ID = '\0' + ENTRY_ID;

  return {
    name: 'sunpeak-inspect-virtual',
    resolveId(id) {
      if (id === ENTRY_ID) return RESOLVED_ENTRY_ID;
    },
    load(id) {
      if (id !== RESOLVED_ENTRY_ID) return;

      return `
import { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Inspector } from 'sunpeak/inspector';
import 'sunpeak/style.css';

const simulations = ${JSON.stringify(simulations)};
const appName = ${JSON.stringify(appName ?? 'MCP Inspector')};
const appIcon = ${JSON.stringify(appIcon ?? null)};
const sandboxUrl = ${JSON.stringify(sandboxUrl)};
const defaultProdResources = ${JSON.stringify(modeFlags.defaultProdResources ?? false)};
const hideInspectorModes = ${JSON.stringify(modeFlags.hideInspectorModes ?? false)};

const onCallTool = async (params) => {
  const res = await fetch('/__sunpeak/call-tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
};

const onCallToolDirect = async (params) => {
  const res = await fetch('/__sunpeak/call-tool-direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
};

const root = createRoot(document.getElementById('root'));
root.render(
  createElement(StrictMode, null,
    createElement(Inspector, {
      simulations,
      mcpServerUrl: ${JSON.stringify(serverUrl)},
      appName,
      appIcon,
      sandboxUrl,
      onCallTool,
      onCallToolDirect,
      defaultProdResources,
      hideInspectorModes,
    })
  )
);
`;
    },
  };
}

/**
 * Vite plugin for MCP server proxy endpoints.
 * @param {() => import('@modelcontextprotocol/sdk/client/index.js').Client} getClient
 * @param {(client: import('@modelcontextprotocol/sdk/client/index.js').Client) => void} setClient
 * @param {{ callToolDirect?: (name: string, args: Record<string, unknown>) => Promise<object>, simulationsDir?: string | null }} [pluginOpts]
 */
function sunpeakInspectEndpointsPlugin(getClient, setClient, pluginOpts = {}) {
  // In-memory OAuth state keyed by server URL, persisted across reconnects.
  /** @type {Map<string, { provider: any, getAuthUrl: () => URL | undefined, hasTokens: () => boolean, stateParam: string }>} */
  const oauthProviders = new Map();
  // Map OAuth state parameter → { serverUrl, oauthState } for CSRF-safe callback matching.
  // Stores a direct reference to the provider that initiated the flow, so even if
  // oauthProviders[serverUrl] is overwritten by a concurrent flow, the callback
  // still completes with the correct provider (which holds the right codeVerifier
  // and clientInformation).
  /** @type {Map<string, { serverUrl: string, oauthState: any }>} */
  const pendingOAuthFlows = new Map();
  return {
    name: 'sunpeak-inspect-endpoints',
    configureServer(server) {
      // List tools from connected server
      server.middlewares.use('/__sunpeak/list-tools', async (_req, res) => {
        try {
          const client = getClient();
          const result = await client.listTools();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // Call tool on connected server
      server.middlewares.use('/__sunpeak/call-tool', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end('Method not allowed');
          return;
        }

        const body = await readRequestBody(req);
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
          return;
        }

        try {
          const { name, arguments: args } = parsed;
          const client = getClient();
          const result = await client.callTool({ name, arguments: args });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              content: [{ type: 'text', text: `Error: ${err.message}` }],
              isError: true,
            })
          );
        }
      });

      // Call tool handler directly, bypassing MCP server mock data.
      // Used by the Prod Tools Run button so the real handler executes even
      // when the MCP server would return simulation fixture data.
      server.middlewares.use('/__sunpeak/call-tool-direct', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end('Method not allowed');
          return;
        }

        if (!pluginOpts.callToolDirect) {
          // No direct handler available (pure inspect mode) — fall back to MCP
          const body = await readRequestBody(req);
          let parsed;
          try { parsed = JSON.parse(body); } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
            return;
          }
          try {
            const client = getClient();
            const result = await client.callTool({ name: parsed.name, arguments: parsed.arguments });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true }));
          }
          return;
        }

        const body = await readRequestBody(req);
        let parsed;
        try { parsed = JSON.parse(body); } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }

        try {
          const result = await pluginOpts.callToolDirect(parsed.name, parsed.arguments ?? {});
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true }));
        }
      });

      // Reconnect to a new MCP server URL.
      // Creates a new MCP client connection and replaces the current one.
      server.middlewares.use('/__sunpeak/connect', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end('Method not allowed');
          return;
        }

        const body = await readRequestBody(req);
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }

        const url = parsed.url;
        if (!url) {
          // No URL provided — just verify current connection
          try {
            const client = getClient();
            await client.listTools();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        try {
          // Close old connection (best effort)
          try { await getClient().close(); } catch { /* ignore */ }

          // Build auth config from request
          const authConfig = parsed.auth;
          let connectionAuth;
          if (authConfig?.type === 'bearer' && authConfig.bearerToken) {
            connectionAuth = { type: 'bearer', bearerToken: authConfig.bearerToken };
          } else if (authConfig?.type === 'oauth') {
            // Reuse existing OAuth provider if we have one for this server
            const existing = oauthProviders.get(url);
            if (existing?.hasTokens()) {
              connectionAuth = { type: 'oauth', authProvider: existing.provider };
            }
          }

          // Create new connection
          const newConnection = await createMcpConnection(url, connectionAuth);
          setClient(newConnection.client);

          // Discover tools and resources from the new server
          const simulations = await discoverSimulations(newConnection.client);
          // Merge fixture data so simulations have mock toolInput/toolResult
          if (pluginOpts.simulationsDir) {
            mergeSimulationFixtures(pluginOpts.simulationsDir, simulations);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', simulations }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // ── OAuth flow endpoints ──

      // Start OAuth: discover metadata, register client, return authorization URL
      server.middlewares.use('/__sunpeak/oauth/start', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end('Method not allowed');
          return;
        }

        const body = await readRequestBody(req);
        let parsed;
        try { parsed = JSON.parse(body); } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }

        const { url: serverUrl, scope, clientId, clientSecret } = parsed;
        if (!serverUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing url' }));
          return;
        }

        try {
          // Determine callback URL from the Vite server's address
          const addr = server.httpServer?.address();
          const port = typeof addr === 'object' && addr ? addr.port : 3000;
          const callbackUrl = `http://localhost:${port}/__sunpeak/oauth/callback`;

          // Check if we already have a working provider with tokens for this server.
          // If so, try to connect directly before creating a fresh provider.
          const existingState = oauthProviders.get(serverUrl);
          if (existingState?.hasTokens()) {
            try {
              // Close old connection (best effort)
              try { await getClient().close(); } catch { /* ignore */ }

              const newConnection = await createMcpConnection(serverUrl, {
                type: 'oauth',
                authProvider: existingState.provider,
              });
              setClient(newConnection.client);
              const simulations = await discoverSimulations(newConnection.client);
              if (pluginOpts.simulationsDir) {
                mergeSimulationFixtures(pluginOpts.simulationsDir, simulations);
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'authorized', simulations }));
              return;
            } catch {
              // Tokens may be expired, fall through to fresh auth below
            }
          }

          // Always create a fresh provider for an explicit Authorize click.
          // This ensures the user's current credentials (or lack thereof) are
          // used, not stale ones from a previous attempt.
          const oauthState = createInMemoryOAuthProvider(callbackUrl, { clientId, clientSecret });
          oauthProviders.set(serverUrl, oauthState);

          // Run the SDK auth flow — will call redirectToAuthorization() if needed
          const { auth } = await import('@modelcontextprotocol/sdk/client/auth.js');
          const result = await auth(oauthState.provider, {
            serverUrl,
            scope,
          });

          if (result === 'REDIRECT') {
            const authUrl = oauthState.getAuthUrl();
            if (!authUrl) {
              throw new Error('OAuth flow requested redirect but no authorization URL was generated');
            }
            // Register the state parameter so the callback can find the right provider.
            // Clean up any stale pending flows for the same server URL first
            // (e.g., user closed the popup without completing the previous attempt).
            for (const [key, val] of pendingOAuthFlows) {
              if (val.serverUrl === serverUrl) pendingOAuthFlows.delete(key);
            }
            pendingOAuthFlows.set(oauthState.stateParam, { serverUrl, oauthState });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'redirect', authUrl: authUrl.toString() }));
          } else {
            // AUTHORIZED — tokens were already available (shouldn't normally happen on first call)
            try { await getClient().close(); } catch { /* ignore */ }
            const newConnection = await createMcpConnection(serverUrl, {
              type: 'oauth',
              authProvider: oauthState.provider,
            });
            setClient(newConnection.client);
            const simulations = await discoverSimulations(newConnection.client);
            if (pluginOpts.simulationsDir) {
              mergeSimulationFixtures(pluginOpts.simulationsDir, simulations);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'authorized', simulations }));
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // OAuth callback: serves an HTML page that sends the code back to the inspector.
      // The state parameter is validated server-side in /__sunpeak/oauth/complete.
      server.middlewares.use('/__sunpeak/oauth/callback', async (req, res) => {
        // Parse code + state from query params
        const reqUrl = new URL(req.url, 'http://localhost');
        const code = reqUrl.searchParams.get('code');
        const state = reqUrl.searchParams.get('state');
        const error = reqUrl.searchParams.get('error');
        const errorDescription = reqUrl.searchParams.get('error_description');

        // Escape values for safe embedding in <script> — JSON.stringify alone
        // doesn't escape "</script>" sequences which would break out of the tag.
        const safeJson = (val) => JSON.stringify(val).replace(/</g, '\\u003c');

        const html = `<!DOCTYPE html>
<html><head><title>OAuth Callback</title></head>
<body>
<script>
(function() {
  var code = ${safeJson(code)};
  var state = ${safeJson(state)};
  var error = ${safeJson(error)};
  var errorDescription = ${safeJson(errorDescription)};

  // Use our own origin as the postMessage targetOrigin to prevent leaking data cross-origin.
  var origin = location.origin;

  // Send a message to the opener window. Uses postMessage when window.opener is
  // available, falls back to BroadcastChannel for OAuth providers that set
  // Cross-Origin-Opener-Policy (COOP) which nullifies window.opener.
  function notify(msg) {
    if (window.opener) {
      window.opener.postMessage(msg, origin);
    } else if (typeof BroadcastChannel !== 'undefined') {
      var bc = new BroadcastChannel('sunpeak-oauth');
      bc.postMessage(msg);
      bc.close();
    }
  }

  if (error) {
    notify({ type: 'sunpeak-oauth-callback', error: error, errorDescription: errorDescription });
    document.body.textContent = 'Authorization failed: ' + (errorDescription || error);
    setTimeout(function() { window.close(); }, 2000);
    return;
  }

  if (!code) {
    document.body.textContent = 'No authorization code received.';
    return;
  }

  document.body.textContent = 'Completing authorization...';

  // Post the code + state to the server to exchange for tokens.
  // The state is validated server-side to prevent CSRF.
  fetch('/__sunpeak/oauth/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code, state: state })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.error) {
      notify({ type: 'sunpeak-oauth-callback', error: data.error });
      document.body.textContent = 'Authorization failed: ' + data.error;
    } else {
      notify({ type: 'sunpeak-oauth-callback', success: true, simulations: data.simulations });
      document.body.textContent = 'Authorized! You can close this window.';
    }
    setTimeout(function() { window.close(); }, 1000);
  })
  .catch(function(err) {
    notify({ type: 'sunpeak-oauth-callback', error: err.message });
    document.body.textContent = 'Error: ' + err.message;
  });
})();
</script>
</body></html>`;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      });

      // Complete OAuth: exchange authorization code for tokens and connect
      server.middlewares.use('/__sunpeak/oauth/complete', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end('Method not allowed');
          return;
        }

        const body = await readRequestBody(req);
        let parsed;
        try { parsed = JSON.parse(body); } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }

        const { code, state } = parsed;
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing authorization code' }));
          return;
        }
        if (!state) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing state parameter' }));
          return;
        }

        // Look up the provider via the state parameter (CSRF protection).
        // Uses the direct provider reference from the pending flow, not the
        // oauthProviders map, so concurrent flows for the same server URL
        // don't clobber each other's codeVerifier/clientInformation.
        const pending = pendingOAuthFlows.get(state);
        pendingOAuthFlows.delete(state); // Consume — single-use

        if (!pending) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid or expired OAuth state. Start the flow again.' }));
          return;
        }

        const { serverUrl, oauthState } = pending;

        try {
          // Exchange the code for tokens
          const { auth } = await import('@modelcontextprotocol/sdk/client/auth.js');
          const result = await auth(oauthState.provider, {
            serverUrl,
            authorizationCode: code,
          });

          if (result !== 'AUTHORIZED') {
            throw new Error('Token exchange did not result in authorization');
          }

          // Store the now-authorized provider so reconnects can reuse tokens.
          oauthProviders.set(serverUrl, oauthState);

          // Create MCP connection with the authorized provider
          try { await getClient().close(); } catch { /* ignore */ }
          const newConnection = await createMcpConnection(serverUrl, {
            type: 'oauth',
            authProvider: oauthState.provider,
          });
          setClient(newConnection.client);

          const simulations = await discoverSimulations(newConnection.client);
          if (pluginOpts.simulationsDir) {
            mergeSimulationFixtures(pluginOpts.simulationsDir, simulations);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', simulations }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // Read resource from connected server
      server.middlewares.use('/__sunpeak/read-resource', async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const uri = url.searchParams.get('uri');
        if (!uri) {
          res.writeHead(400);
          res.end('Missing uri parameter');
          return;
        }

        try {
          const client = getClient();
          const result = await client.readResource({ uri });
          const content = result.contents?.[0];
          if (!content) {
            res.writeHead(404);
            res.end('Resource not found');
            return;
          }

          const mimeType = content.mimeType || 'text/html';
          res.writeHead(200, {
            'Content-Type': `${mimeType}; charset=utf-8`,
            'X-Content-Type-Options': 'nosniff',
          });
          if (typeof content.text === 'string') {
            const stripOverlay = url.searchParams.get('devOverlay') === 'false';
            let text = content.text;
            if (stripOverlay) {
              // Strip dev overlay (e.g., for e2e tests)
              text = text.replace(/<script>(?:(?!<\/script>)[\s\S])*?__sunpeak-dev-timing(?:(?!<\/script>)[\s\S])*?<\/script>/g, '');
            } else if (process.env.SUNPEAK_DEV_OVERLAY !== 'false' && !text.includes('__sunpeak-dev-timing') && text.includes('</body>')) {
              // Inject dev overlay into resources from non-sunpeak servers.
              // The overlay shows resource served timestamp and tool timing (from
              // _meta._sunpeak.requestTimeMs on the PostMessage tool-result notification).
              text = text.replace('</body>', `${getDevOverlayScript(Date.now(), null)}\n</body>`);
            }
            res.end(text);
          } else if (content.blob) {
            res.end(Buffer.from(content.blob, 'base64'));
          } else {
            res.end('');
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(`Error reading resource: ${err.message}`);
        }
      });
    },
  };
}

/**
 * Read the full body of an HTTP request.
 */
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/**
 * Core inspect server logic. Connects to an MCP server, discovers tools/resources,
 * merges simulation fixtures, and serves the inspector UI via Vite.
 *
 * Used by both `sunpeak inspect` (CLI) and `sunpeak dev` (programmatic).
 *
 * @param {object} opts
 * @param {string} opts.server - MCP server URL or stdio command
 * @param {string|null} [opts.simulationsDir] - Path to simulation fixtures directory
 * @param {number} [opts.port] - Dev server port (default: 3000)
 * @param {string} [opts.name] - App name override
 * @param {string} [opts.sandboxUrl] - Existing sandbox server URL (skips creating one)
 * @param {boolean} [opts.frameworkMode] - If true, show framework-only controls (Prod Resources)
 * @param {boolean} [opts.defaultProdResources] - Initial prod resources state
 * @param {string} [opts.projectRoot] - Project directory for serving /dist/ files (prod resources)
 * @param {boolean} [opts.noBegging] - Suppress star message
 * @param {boolean} [opts.open] - Whether to open browser (default: !CI && !SUNPEAK_LIVE_TEST)
 * @param {(name: string, args: Record<string, unknown>) => Promise<object>} [opts.callToolDirect] - Direct handler call (bypasses MCP, for prod-tools)
 * @param {() => Promise<void>} [opts.onCleanup] - Additional cleanup callback on exit
 * @param {Record<string, string>} [opts.resolveAlias] - Vite resolve aliases (e.g., to map sunpeak imports to source)
 * @param {object[]} [opts.vitePlugins] - Additional Vite plugins (e.g., Tailwind for source CSS)
 * @param {object} [opts.viteCssConfig] - Vite css config override (e.g., lightningcss customAtRules)
 */
export async function inspectServer(opts) {
  const {
    server: serverArg,
    simulationsDir = null,
    port: preferredPort,
    name: nameOverride,
    sandboxUrl: existingSandboxUrl,
    frameworkMode = false,
    defaultProdResources = false,
    projectRoot = null,
    noBegging = false,
    open,
    onCleanup,
    resolveAlias,
    vitePlugins: extraVitePlugins = [],
    viteCssConfig,
  } = opts;

  // Load favicon from sunpeak package for the inspector UI.
  let faviconDataUri = null;
  let faviconBuffer = null;
  try {
    const distMcp = join(SUNPEAK_PKG_DIR, 'dist/mcp/index.js');
    if (existsSync(distMcp)) {
      const mod = await import(pathToFileURL(distMcp).href);
      faviconDataUri = mod.FAVICON_DATA_URI;
      faviconBuffer = mod.FAVICON_BUFFER;
    }
  } catch {
    // Non-fatal — inspector will just not have a favicon
  }

  console.log(`Connecting to MCP server: ${serverArg}`);

  // Connect to the MCP server (with retry for local servers that may still be starting)
  let mcpConnection;
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      mcpConnection = await createMcpConnection(serverArg);
      break;
    } catch (err) {
      if (attempt === maxRetries) {
        console.error(`Failed to connect to MCP server: ${err.message}`);
        process.exit(1);
      }
      console.log(`Connection attempt ${attempt}/${maxRetries} failed, retrying...`);
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('Connected. Discovering tools and resources...');

  // Extract app name and icon from server info (reported during MCP initialize)
  const serverInfo = mcpConnection.client.getServerVersion();
  const serverAppName = nameOverride ?? serverInfo?.name;
  const serverAppIcon = serverInfo?.icons?.[0]?.src;

  // Discover tools/resources and build simulations
  const simulations = await discoverSimulations(mcpConnection.client);
  const toolCount = Object.keys(simulations).length;
  const resourceCount = Object.values(simulations).filter((s) => s.resource).length;
  console.log(`Found ${toolCount} tool(s), ${resourceCount} resource(s).`);

  // Merge simulation fixtures when a directory is provided
  if (simulationsDir) {
    mergeSimulationFixtures(simulationsDir, simulations);
  }


  // Start or reuse sandbox server
  let sandbox;
  let ownsSandbox = false;
  if (existingSandboxUrl) {
    sandbox = { url: existingSandboxUrl, close: async () => {} };
  } else {
    const sandboxPort = Number(process.env.SUNPEAK_SANDBOX_PORT) || undefined;
    sandbox = await startSandboxServer({
      preferredPort: sandboxPort ?? 24680,
    });
    ownsSandbox = true;
  }

  // Determine server port
  const port = preferredPort || Number(process.env.PORT) || (await getPort(3000));

  // Import Vite
  const { createServer } = await import('vite');
  const react = (await import('@vitejs/plugin-react')).default;

  // Build the virtual index.html
  const appTitle = (serverAppName ?? 'MCP Inspector').replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]
  );
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appTitle} — sunpeak</title>${faviconDataUri ? `\n  <link rel="icon" type="image/png" href="${faviconDataUri}" />` : ''}
  <style>html, body, #root { margin: 0; padding: 0; height: 100%; }</style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/@id/__x00__virtual:sunpeak-inspect-entry"></script>
</body>
</html>`;

  const inspectorServerUrl = serverArg;

  // Create the Vite server.
  // Use the sunpeak package dir as root to avoid scanning the user's project
  // files for dependencies (which can cause resolution errors for @ aliases etc.)
  const server = await createServer({
    root: SUNPEAK_PKG_DIR,
    configFile: false,
    ...(resolveAlias ? { resolve: { alias: resolveAlias } } : {}),
    ...(viteCssConfig ? { css: { lightningcss: viteCssConfig } } : {}),
    plugins: [
      react(),
      ...extraVitePlugins,
      sunpeakInspectVirtualPlugin(
        simulations,
        inspectorServerUrl,
        serverAppName,
        serverAppIcon,
        sandbox.url,
        { defaultProdResources, hideInspectorModes: !frameworkMode }
      ),
      sunpeakInspectEndpointsPlugin(
        () => mcpConnection.client,
        (newClient) => { mcpConnection.client = newClient; },
        { callToolDirect: opts.callToolDirect, simulationsDir }
      ),
      // Serve /dist/{name}/{name}.html from the project directory (for Prod Resources mode).
      // The Inspector polls these paths via HEAD to check if built resources exist.
      // Only intercepts .html files under /dist/ — other /dist/ paths (like sunpeak's
      // own dist/inspector/index.js) must fall through to Vite's module resolution.
      ...(projectRoot ? [{
        name: 'sunpeak-dist-serve',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (!req.url?.startsWith('/dist/') || !req.url.endsWith('.html')) return next();
            const filePath = join(projectRoot, req.url);
            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf-8');
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(content);
            } else {
              res.writeHead(404);
              res.end('Not found');
            }
          });
        },
      }] : []),
      // Serve virtual index.html
      {
        name: 'sunpeak-inspect-index-html',
        configureServer(server) {
          // Serve index.html for all non-API, non-asset requests (SPA fallback)
          server.middlewares.use((req, res, next) => {
            if (
              req.url === '/' ||
              req.url === '/index.html' ||
              (!req.url.startsWith('/__sunpeak/') &&
                !req.url.startsWith('/@') &&
                !req.url.startsWith('/node_modules/') &&
                req.url !== '/health' &&
                !req.url.includes('.'))
            ) {
              // Transform through Vite to resolve module imports
              server.transformIndexHtml(req.url, indexHtml).then((html) => {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(html);
              }).catch(next);
              return;
            }
            next();
          });
        },
      },
      // Paint fence responder
      {
        name: 'sunpeak-fence-responder',
        transformIndexHtml(html) {
          const fenceScript = `<script>window.addEventListener("message",function(e){if(e.data&&e.data.method==="sunpeak/fence"){var fid=e.data.params&&e.data.params.fenceId;requestAnimationFrame(function(){e.source.postMessage({jsonrpc:"2.0",method:"sunpeak/fence-ack",params:{fenceId:fid}},"*");});}});</script>`;
          return html.replace('</head>', fenceScript + '</head>');
        },
      },
      // Favicon
      ...(faviconBuffer ? [{
        name: 'sunpeak-favicon',
        configureServer(server) {
          server.middlewares.use('/favicon.ico', (_req, res) => {
            res.writeHead(200, {
              'Content-Type': 'image/png',
              'Content-Length': faviconBuffer.length,
              'Cache-Control': 'public, max-age=86400',
            });
            res.end(faviconBuffer);
          });
        },
      }] : []),
      // Health endpoint
      {
        name: 'sunpeak-health',
        configureServer(server) {
          server.middlewares.use('/health', (_req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
          });
        },
      },
    ],
    server: {
      port,
      open: open ?? (!process.env.CI && !process.env.SUNPEAK_LIVE_TEST),
      allowedHosts: 'all',
    },
    optimizeDeps: {
      // Only pre-bundle React — the virtual entry module imports sunpeak from
      // node_modules, so no user source scanning needed.
      include: ['react', 'react-dom', 'react/jsx-runtime'],
      // Disable scanning user's project files (avoids @ alias resolution errors)
      entries: [],
    },
  });

  await server.listen();
  server.printUrls();
  server.bindCLIShortcuts({ print: true });

  // Print star-begging message unless suppressed
  if (!noBegging) {
    // #FFB800 in 24-bit ANSI color
    console.log('\n\n\x1b[38;2;255;184;0m\u2b50\ufe0f \u2192 \u2764\ufe0f  https://github.com/Sunpeak-AI/sunpeak\x1b[0m\n');
  }

  // Cleanup on exit
  const cleanup = async () => {
    if (ownsSandbox) await sandbox.close();
    try {
      await mcpConnection.client.close();
    } catch {
      // Ignore close errors
    }
    await server.close();
    if (onCleanup) await onCleanup();
  };

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });
}

/**
 * CLI entry point for `sunpeak inspect`.
 */
export async function inspect(args) {
  const opts = parseArgs(args);

  if (!opts.server) {
    console.error('Error: --server is required.');
    console.error('Run "sunpeak inspect --help" for usage.');
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const simulationsDir = opts.simulations ? resolve(projectRoot, opts.simulations) : null;

  await inspectServer({
    server: opts.server,
    simulationsDir,
    port: opts.port,
    name: opts.name,
  });
}
