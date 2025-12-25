/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - CLI command modules are .mjs files without TypeScript declarations
import { describe, it, expect, vi } from 'vitest';

// Helper functions to import CLI modules dynamically
const importLogin = () => import('../../bin/commands/login.mjs');
const importLogout = () => import('../../bin/commands/logout.mjs');
const importPush = () => import('../../bin/commands/push.mjs');
const importPull = () => import('../../bin/commands/pull.mjs');
const importDeploy = () => import('../../bin/commands/deploy.mjs');

// Mock console for all tests
const createMockConsole = () => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
});

// Mock process for tests that call process.exit
const createMockProcess = () => ({
  exit: vi.fn(),
  cwd: () => '/test/project',
});

describe('CLI Commands', () => {
  describe('login command', () => {
    it('should show message when already logged in', async () => {
      const { login } = await importLogin();
      const mockConsole = createMockConsole();

      await login({
        loadCredentials: () => ({ access_token: 'existing-token' }),
        console: mockConsole,
      });

      expect(mockConsole.log).toHaveBeenCalledWith(
        'Already logged in. Run "sunpeak logout" first to switch accounts.'
      );
    });

    it('should initiate device authorization flow when not logged in', async () => {
      const { login } = await importLogin();
      const mockConsole = createMockConsole();

      const deviceAuthResponse = {
        device_code: 'test-device-code',
        user_code: 'ABCD-1234',
        verification_uri: 'https://example.com/verify',
        verification_uri_complete: 'https://example.com/verify?code=ABCD-1234',
        expires_in: 300,
      };

      const tokenResponse = {
        access_token: 'new-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      let _fetchCallCount = 0;
      const mockFetch = vi.fn().mockImplementation(async (url) => {
        _fetchCallCount++;
        if (url.includes('/oauth/device_authorization')) {
          return {
            ok: true,
            json: async () => deviceAuthResponse,
          };
        }
        if (url.includes('/oauth/token')) {
          return {
            ok: true,
            text: async () => JSON.stringify(tokenResponse),
          };
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      let savedCredentials: Record<string, unknown> | null = null;

      await login({
        loadCredentials: () => null,
        saveCredentials: (creds: Record<string, unknown>) => {
          savedCredentials = creds;
        },
        openBrowser: async () => true,
        fetch: mockFetch,
        console: mockConsole,
        sleep: async () => {},
        apiUrl: 'https://test.sunpeak.ai',
        pollIntervalMs: 0,
        maxPollDurationMs: 10000,
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(savedCredentials).not.toBeNull();
      expect(savedCredentials!.access_token).toBe('new-access-token');
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Successfully logged in')
      );
    });

    it('should handle authorization pending during polling', async () => {
      const { login } = await importLogin();
      const mockConsole = createMockConsole();

      const deviceAuthResponse = {
        device_code: 'test-device-code',
        user_code: 'ABCD-1234',
        verification_uri: 'https://example.com/verify',
      };

      let pollCount = 0;
      const mockFetch = vi.fn().mockImplementation(async (url) => {
        if (url.includes('/oauth/device_authorization')) {
          return {
            ok: true,
            json: async () => deviceAuthResponse,
          };
        }
        if (url.includes('/oauth/token')) {
          pollCount++;
          if (pollCount < 3) {
            return {
              ok: false,
              text: async () => JSON.stringify({ error: 'authorization_pending' }),
            };
          }
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                access_token: 'token-after-poll',
                token_type: 'Bearer',
              }),
          };
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      let savedCredentials: Record<string, unknown> | null = null;

      await login({
        loadCredentials: () => null,
        saveCredentials: (creds: Record<string, unknown>) => {
          savedCredentials = creds;
        },
        openBrowser: async () => true,
        fetch: mockFetch,
        console: mockConsole,
        sleep: async () => {},
        apiUrl: 'https://test.sunpeak.ai',
        pollIntervalMs: 0,
        maxPollDurationMs: 10000,
      });

      expect(pollCount).toBe(3);
      expect(savedCredentials!.access_token).toBe('token-after-poll');
    });

    it('should handle access denied error', async () => {
      const { login } = await importLogin();
      const mockConsole = createMockConsole();

      const deviceAuthResponse = {
        device_code: 'test-device-code',
        user_code: 'ABCD-1234',
        verification_uri: 'https://example.com/verify',
      };

      const mockFetch = vi.fn().mockImplementation(async (url) => {
        if (url.includes('/oauth/device_authorization')) {
          return {
            ok: true,
            json: async () => deviceAuthResponse,
          };
        }
        if (url.includes('/oauth/token')) {
          return {
            ok: false,
            text: async () => JSON.stringify({ error: 'access_denied' }),
          };
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      await expect(
        login({
          loadCredentials: () => null,
          saveCredentials: vi.fn(),
          openBrowser: async () => true,
          fetch: mockFetch,
          console: mockConsole,
          sleep: async () => {},
          apiUrl: 'https://test.sunpeak.ai',
          pollIntervalMs: 0,
          maxPollDurationMs: 10000,
        })
      ).rejects.toThrow('Authorization denied by user');
    });
  });

  describe('logout command', () => {
    it('should show message when not logged in', async () => {
      const { logout } = await importLogout();
      const mockConsole = createMockConsole();

      await logout({
        loadCredentials: () => null,
        console: mockConsole,
      });

      expect(mockConsole.log).toHaveBeenCalledWith('Not logged in.');
    });

    it('should revoke token and delete credentials on successful logout', async () => {
      const { logout } = await importLogout();
      const mockConsole = createMockConsole();
      let credentialsDeleted = false;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
      });

      await logout({
        loadCredentials: () => ({ access_token: 'test-token' }),
        deleteCredentials: () => {
          credentialsDeleted = true;
        },
        fetch: mockFetch,
        console: mockConsole,
        apiUrl: 'https://test.sunpeak.ai',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.sunpeak.ai/oauth/revoke',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(credentialsDeleted).toBe(true);
      expect(mockConsole.log).toHaveBeenCalledWith('✓ Successfully logged out of Sunpeak.');
    });

    it('should delete credentials even when revocation fails', async () => {
      const { logout } = await importLogout();
      const mockConsole = createMockConsole();
      let credentialsDeleted = false;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      await logout({
        loadCredentials: () => ({ access_token: 'test-token' }),
        deleteCredentials: () => {
          credentialsDeleted = true;
        },
        fetch: mockFetch,
        console: mockConsole,
        apiUrl: 'https://test.sunpeak.ai',
      });

      expect(credentialsDeleted).toBe(true);
      expect(mockConsole.log).toHaveBeenCalledWith(
        '✓ Logged out locally. (Server token revocation may have failed)'
      );
    });
  });

  describe('push command', () => {
    it('should error when not logged in', async () => {
      const { push } = await importPush();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();

      await push(
        '/test/project',
        {},
        {
          loadCredentials: () => null,
          console: mockConsole,
          process: mockProcess,
        }
      );

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error: Not logged in. Run "sunpeak login" first.'
      );
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should error when repository cannot be determined', async () => {
      const { push } = await importPush();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();

      await push(
        '/test/project',
        {},
        {
          loadCredentials: () => ({ access_token: 'test-token' }),
          getGitRepoName: () => null,
          console: mockConsole,
          process: mockProcess,
        }
      );

      expect(mockConsole.error).toHaveBeenCalledWith('Error: Could not determine repository name.');
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should error when dist directory does not exist', async () => {
      const { push } = await importPush();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();

      await push(
        '/test/project',
        {},
        {
          loadCredentials: () => ({ access_token: 'test-token' }),
          getGitRepoName: () => 'owner/repo',
          existsSync: () => false,
          console: mockConsole,
          process: mockProcess,
        }
      );

      expect(mockConsole.error).toHaveBeenCalledWith('Error: dist/ directory not found');
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should push resources successfully', async () => {
      const { push } = await importPush();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'resource-123', tags: ['v1.0'] }),
      });

      await push(
        '/test/project',
        { repository: 'owner/repo', tags: ['v1.0'] },
        {
          loadCredentials: () => ({ access_token: 'test-token' }),
          getGitRepoName: () => 'owner/repo',
          existsSync: (path: string) => {
            if (path.includes('dist')) return true;
            if (path.endsWith('.js')) return true;
            if (path.endsWith('.json')) return true;
            return false;
          },
          readdirSync: () => ['widget.js', 'widget.json'],
          readFileSync: (path: string) => {
            if (path.endsWith('.json')) {
              return JSON.stringify({
                uri: 'ui://widget',
                name: 'widget',
                title: 'Test Widget',
              });
            }
            return 'console.log("test");';
          },
          fetch: mockFetch,
          console: mockConsole,
          process: mockProcess,
          apiUrl: 'https://test.sunpeak.ai',
        }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.sunpeak.ai/api/v1/resources',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('Successfully pushed'));
    });

    it('should show help when requested', async () => {
      const { push } = await importPush();
      const mockConsole = createMockConsole();

      await push(
        '/test/project',
        { help: true },
        {
          console: mockConsole,
        }
      );

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('sunpeak push'));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('--repository'));
    });
  });

  describe('pull command', () => {
    it('should error when not logged in', async () => {
      const { pull } = await importPull();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();

      await pull(
        '/test/project',
        { repository: 'owner/repo', tag: 'prod' },
        {
          loadCredentials: () => null,
          console: mockConsole,
          process: mockProcess,
        }
      );

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error: Not logged in. Run "sunpeak login" first.'
      );
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should error when repository is not provided', async () => {
      const { pull } = await importPull();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();

      await pull(
        '/test/project',
        { tag: 'prod' },
        {
          loadCredentials: () => ({ access_token: 'test-token' }),
          console: mockConsole,
          process: mockProcess,
        }
      );

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error: Repository is required. Use --repository or -r to specify a repository.'
      );
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should error when tag is not provided', async () => {
      const { pull } = await importPull();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();

      await pull(
        '/test/project',
        { repository: 'owner/repo' },
        {
          loadCredentials: () => ({ access_token: 'test-token' }),
          console: mockConsole,
          process: mockProcess,
        }
      );

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error: Tag is required. Use --tag or -t to specify a tag.'
      );
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should pull resources successfully', async () => {
      const { pull } = await importPull();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();
      const writtenFiles: Record<string, string> = {};

      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/api/v1/resources/lookup')) {
          return {
            ok: true,
            json: async () => ({
              resources: [
                {
                  name: 'widget',
                  title: 'Test Widget',
                  uri: 'ui://widget',
                  tags: ['prod'],
                  created_at: '2024-01-01T00:00:00Z',
                  mime_type: 'text/html+skybridge',
                  js_file: { url: 'https://example.com/widget.js' },
                },
              ],
            }),
          };
        }
        if (url.includes('example.com/widget.js')) {
          return {
            ok: true,
            text: async () => 'console.log("widget");',
          };
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      await pull(
        '/test/output',
        { repository: 'owner/repo', tag: 'prod' },
        {
          loadCredentials: () => ({ access_token: 'test-token' }),
          existsSync: () => true,
          mkdirSync: vi.fn(),
          writeFileSync: (path: string, content: string) => {
            writtenFiles[path] = content;
          },
          fetch: mockFetch,
          console: mockConsole,
          process: mockProcess,
          apiUrl: 'https://test.sunpeak.ai',
        }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api/v1/resources/lookup'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(writtenFiles['/test/output/widget.js']).toBe('console.log("widget");');
      expect(writtenFiles['/test/output/widget.json']).toBeDefined();
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('Successfully pulled'));
    });

    it('should show help when requested', async () => {
      const { pull } = await importPull();
      const mockConsole = createMockConsole();

      await pull(
        '/test/project',
        { help: true },
        {
          console: mockConsole,
        }
      );

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('sunpeak pull'));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('--repository'));
    });
  });

  describe('deploy command', () => {
    it('should show help when requested', async () => {
      const { deploy } = await importDeploy();
      const mockConsole = createMockConsole();

      await deploy(
        '/test/project',
        { help: true },
        {
          console: mockConsole,
        }
      );

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('sunpeak deploy'));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('--repository'));
    });

    it('should always include prod tag', async () => {
      const { deploy } = await importDeploy();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();

      let capturedFormData: FormData | null = null;
      const mockFetch = vi
        .fn()
        .mockImplementation(async (_url: string, options: { body: FormData }) => {
          capturedFormData = options.body;
          return {
            ok: true,
            json: async () => ({ id: 'resource-123', tags: ['prod', 'v1.0'] }),
          };
        });

      await deploy(
        '/test/project',
        { repository: 'owner/repo', tags: ['v1.0'] },
        {
          loadCredentials: () => ({ access_token: 'test-token' }),
          getGitRepoName: () => 'owner/repo',
          existsSync: (path: string) => {
            if (path.includes('dist')) return true;
            if (path.endsWith('.js')) return true;
            if (path.endsWith('.json')) return true;
            return false;
          },
          readdirSync: () => ['widget.js', 'widget.json'],
          readFileSync: (path: string) => {
            if (path.endsWith('.json')) {
              return JSON.stringify({
                uri: 'ui://widget',
                name: 'widget',
                title: 'Test Widget',
              });
            }
            return 'console.log("test");';
          },
          fetch: mockFetch,
          console: mockConsole,
          process: mockProcess,
          apiUrl: 'https://test.sunpeak.ai',
        }
      );

      // Verify that prod tag is included
      expect(capturedFormData).not.toBeNull();
      const tags = capturedFormData!.getAll('tags[]');
      expect(tags).toContain('prod');
      expect(tags).toContain('v1.0');
    });
  });

  describe('findResources', () => {
    it('should return empty array when directory does not exist', async () => {
      const { findResources } = await importPush();

      const result = findResources('/nonexistent', {
        existsSync: () => false,
      });

      expect(result).toEqual([]);
    });

    it('should find resources with matching js and json files', async () => {
      const { findResources } = await importPush();

      const result = findResources('/test/dist', {
        existsSync: () => true,
        readdirSync: () => ['widget.js', 'widget.json', 'standalone.js', 'other.json'],
        readFileSync: () =>
          JSON.stringify({
            uri: 'ui://widget',
            name: 'widget',
          }),
        console: createMockConsole(),
      });

      // Should only find widget.js because it has a matching widget.json
      // standalone.js has no matching json, other.json has no matching js
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('widget');
    });
  });
});
