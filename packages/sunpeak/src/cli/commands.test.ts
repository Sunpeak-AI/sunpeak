/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - CLI command modules are .mjs files without TypeScript declarations
import { describe, it, expect, vi } from 'vitest';

// Helper functions to import CLI modules dynamically
const importLogin = () => import('../../bin/commands/login.mjs');
const importLogout = () => import('../../bin/commands/logout.mjs');
const importPush = () => import('../../bin/commands/push.mjs');
const importPull = () => import('../../bin/commands/pull.mjs');
const importDeploy = () => import('../../bin/commands/deploy.mjs');
const importUpgrade = () => import('../../bin/commands/upgrade.mjs');
const importNew = () => import('../../bin/commands/new.mjs');

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

// Mock process that throws on exit (to stop execution in tests)
const createThrowingMockProcess = () => ({
  exit: vi.fn().mockImplementation((code: number) => {
    throw new Error(`process.exit(${code})`);
  }),
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
            // Support new folder structure: dist/widget/widget.html
            if (path.includes('dist')) return true;
            if (path.includes('widget')) return true;
            return false;
          },
          readdirSync: (dirPath: string, options?: { withFileTypes?: boolean }) => {
            // New folder structure: dist/{resource}/{resource}.html
            if (options?.withFileTypes) {
              if (dirPath.endsWith('dist')) {
                // Return directory entry for widget
                return [{ name: 'widget', isDirectory: () => true, isFile: () => false }];
              }
            }
            // Return files in resource directory (for simulation discovery)
            if (dirPath.endsWith('/widget')) {
              return ['widget.html', 'widget.json'];
            }
            return [];
          },
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

    it('should push resources with simulations', async () => {
      const { push } = await importPush();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();

      const simulationData = {
        userMessage: 'Test message',
        tool: { name: 'test-tool', title: 'Test Tool' },
        toolResult: { structuredContent: { data: 'test' } },
      };

      let capturedFormData: FormData | null = null;
      const mockFetch = vi
        .fn()
        .mockImplementation(async (_url: string, options: { body: FormData }) => {
          capturedFormData = options.body;
          return {
            ok: true,
            json: async () => ({ id: 'resource-123', tags: ['v1.0'] }),
          };
        });

      await push(
        '/test/project',
        { repository: 'owner/repo', tags: ['v1.0'] },
        {
          loadCredentials: () => ({ access_token: 'test-token' }),
          getGitRepoName: () => 'owner/repo',
          existsSync: (path: string) => {
            if (path.includes('dist')) return true;
            if (path.includes('widget')) return true;
            if (path.includes('tests/simulations')) return true;
            return false;
          },
          readdirSync: (dirPath: string, options?: { withFileTypes?: boolean }) => {
            if (options?.withFileTypes) {
              if (dirPath.endsWith('dist')) {
                return [{ name: 'widget', isDirectory: () => true, isFile: () => false }];
              }
            }
            // Return files in simulations directory
            if (dirPath.endsWith('tests/simulations/widget')) {
              return ['widget-show-simulation.json'];
            }
            return [];
          },
          readFileSync: (path: string) => {
            if (path.endsWith('simulation.json')) {
              return JSON.stringify(simulationData);
            }
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

      expect(capturedFormData).not.toBeNull();
      const simulations = capturedFormData!.get('simulations');
      expect(simulations).not.toBeNull();
      const parsed = JSON.parse(simulations as string);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('show');
      expect(parsed[0].userMessage).toBe('Test message');
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('1 simulation(s)'));
    });

    it('should skip simulations when --no-simulations is set', async () => {
      const { push } = await importPush();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();

      const simulationData = {
        userMessage: 'Test message',
        tool: { name: 'test-tool', title: 'Test Tool' },
        toolResult: { structuredContent: { data: 'test' } },
      };

      let capturedFormData: FormData | null = null;
      const mockFetch = vi
        .fn()
        .mockImplementation(async (_url: string, options: { body: FormData }) => {
          capturedFormData = options.body;
          return {
            ok: true,
            json: async () => ({ id: 'resource-123', tags: [] }),
          };
        });

      await push(
        '/test/project',
        { repository: 'owner/repo', noSimulations: true },
        {
          loadCredentials: () => ({ access_token: 'test-token' }),
          getGitRepoName: () => 'owner/repo',
          existsSync: (path: string) => {
            if (path.includes('dist')) return true;
            if (path.includes('widget')) return true;
            if (path.includes('tests/simulations')) return true;
            return false;
          },
          readdirSync: (dirPath: string, options?: { withFileTypes?: boolean }) => {
            if (options?.withFileTypes) {
              if (dirPath.endsWith('dist')) {
                return [{ name: 'widget', isDirectory: () => true, isFile: () => false }];
              }
            }
            // Return files in simulations directory
            if (dirPath.endsWith('tests/simulations/widget')) {
              return ['widget-show-simulation.json'];
            }
            return [];
          },
          readFileSync: (path: string) => {
            if (path.endsWith('simulation.json')) {
              return JSON.stringify(simulationData);
            }
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

      expect(capturedFormData).not.toBeNull();
      // Simulations should NOT be included in the form data
      const simulations = capturedFormData!.get('simulations');
      expect(simulations).toBeNull();
      expect(mockConsole.log).toHaveBeenCalledWith('Simulations: skipped');
      expect(mockConsole.log).not.toHaveBeenCalledWith(expect.stringContaining('simulation(s)'));
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
                  html_file: { url: 'https://example.com/widget.html' },
                },
              ],
            }),
          };
        }
        if (url.includes('example.com/widget.html')) {
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
      expect(writtenFiles['/test/output/widget.html']).toBe('console.log("widget");');
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
            // Support new folder structure: dist/widget/widget.html
            if (path.includes('dist')) return true;
            if (path.includes('widget')) return true;
            return false;
          },
          readdirSync: (dirPath: string, options?: { withFileTypes?: boolean }) => {
            // New folder structure: dist/{resource}/{resource}.html
            if (options?.withFileTypes) {
              if (dirPath.endsWith('dist')) {
                // Return directory entry for widget
                return [{ name: 'widget', isDirectory: () => true, isFile: () => false }];
              }
            }
            // Return files in resource directory (for simulation discovery)
            if (dirPath.endsWith('/widget')) {
              return ['widget.html', 'widget.json'];
            }
            return [];
          },
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

      const result = findResources('/nonexistent', '/test/simulations', {
        existsSync: () => false,
      });

      expect(result).toEqual([]);
    });

    it('should find resources with new folder structure', async () => {
      const { findResources } = await importPush();

      const result = findResources('/test/dist', '/test/simulations', {
        existsSync: (path: string) => {
          // New folder structure: dist/widget/widget.html, dist/widget/widget.json
          // Only widget folder has both .html and .json files
          if (path.endsWith('/test/dist')) return true;
          if (path.endsWith('/test/dist/widget')) return true;
          if (path.endsWith('/test/dist/widget/widget.html')) return true;
          if (path.endsWith('/test/dist/widget/widget.json')) return true;
          // standalone folder exists but is missing the .json file
          if (path.endsWith('/test/dist/standalone')) return true;
          if (path.endsWith('/test/dist/standalone/standalone.html')) return true;
          // standalone.json does NOT exist
          return false;
        },
        readdirSync: (dirPath: string, options?: { withFileTypes?: boolean }) => {
          if (options?.withFileTypes) {
            if (dirPath.endsWith('dist')) {
              // Return directory entries
              return [
                { name: 'widget', isDirectory: () => true, isFile: () => false },
                { name: 'standalone', isDirectory: () => true, isFile: () => false },
              ];
            }
          }
          // Return files in simulation directory (for simulation discovery)
          return [];
        },
        readFileSync: () =>
          JSON.stringify({
            uri: 'ui://widget',
            name: 'widget',
          }),
        console: createMockConsole(),
      });

      // Should find widget because it has matching widget.html and widget.json in its folder
      // standalone folder exists but is missing standalone.json
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('widget');
      expect(result[0].dir).toBe('/test/dist/widget');
      expect(result[0].simulations).toEqual([]);
    });

    it('should find simulations for resources', async () => {
      const { findResources } = await importPush();

      const simulationData = {
        userMessage: 'Test message',
        tool: { name: 'test-tool' },
        toolResult: { structuredContent: {} },
      };

      const result = findResources('/test/dist', '/test/simulations', {
        existsSync: (path: string) => {
          if (path.endsWith('/test/dist')) return true;
          if (path.endsWith('/test/dist/widget')) return true;
          if (path.endsWith('/test/dist/widget/widget.html')) return true;
          if (path.endsWith('/test/dist/widget/widget.json')) return true;
          // Simulations directory
          if (path.endsWith('/test/simulations/widget')) return true;
          return false;
        },
        readdirSync: (dirPath: string, options?: { withFileTypes?: boolean }) => {
          if (options?.withFileTypes) {
            if (dirPath.endsWith('dist')) {
              return [{ name: 'widget', isDirectory: () => true, isFile: () => false }];
            }
          }
          // Return files in simulations directory
          if (dirPath.endsWith('/test/simulations/widget')) {
            return ['widget-show-simulation.json', 'widget-demo-simulation.json'];
          }
          return [];
        },
        readFileSync: (path: string) => {
          if (path.endsWith('simulation.json')) {
            return JSON.stringify(simulationData);
          }
          return JSON.stringify({
            uri: 'ui://widget',
            name: 'widget',
          });
        },
        console: createMockConsole(),
      });

      expect(result).toHaveLength(1);
      expect(result[0].simulations).toHaveLength(2);
      expect(result[0].simulations[0].name).toBe('show');
      expect(result[0].simulations[0].userMessage).toBe('Test message');
      expect(result[0].simulations[1].name).toBe('demo');
    });
  });

  describe('new command', () => {
    it('should error when no resources are discovered', async () => {
      const { init } = await importNew();
      const mockConsole = createMockConsole();
      const mockProcess = createThrowingMockProcess();

      await expect(
        init('my-project', 'carousel', {
          discoverResources: () => [],
          console: mockConsole,
          process: mockProcess,
        })
      ).rejects.toThrow('process.exit(1)');

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error: No resources found in template/src/resources/'
      );
    });

    it('should error when project name is "template"', async () => {
      const { init } = await importNew();
      const mockConsole = createMockConsole();
      const mockProcess = createThrowingMockProcess();

      await expect(
        init('template', 'carousel', {
          discoverResources: () => ['carousel', 'review'],
          console: mockConsole,
          process: mockProcess,
        })
      ).rejects.toThrow('process.exit(1)');

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error: "template" is a reserved name. Please choose another name.'
      );
    });

    it('should error when directory already exists', async () => {
      const { init } = await importNew();
      const mockConsole = createMockConsole();
      const mockProcess = createThrowingMockProcess();

      await expect(
        init('my-project', 'carousel', {
          discoverResources: () => ['carousel', 'review'],
          existsSync: (path: string) => path.includes('my-project'),
          cwd: () => '/test',
          console: mockConsole,
          process: mockProcess,
        })
      ).rejects.toThrow('process.exit(1)');

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error: Directory "my-project" already exists'
      );
    });

    it('should prompt for project name if not provided', async () => {
      const { init } = await importNew();
      const mockConsole = createMockConsole();
      const mockProcess = createThrowingMockProcess();

      await expect(
        init(undefined, 'carousel', {
          discoverResources: () => ['carousel', 'review'],
          prompt: async () => 'prompted-name',
          existsSync: (path: string) => path.includes('prompted-name'), // Target dir exists
          cwd: () => '/test',
          console: mockConsole,
          process: mockProcess,
        })
      ).rejects.toThrow('process.exit(1)');

      // Should have prompted and then failed on existing directory
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error: Directory "prompted-name" already exists'
      );
    });

    it('should default to "my-app" when prompt returns empty', async () => {
      const { init } = await importNew();
      const mockConsole = createMockConsole();
      const mockProcess = createThrowingMockProcess();

      await expect(
        init(undefined, 'carousel', {
          discoverResources: () => ['carousel', 'review'],
          prompt: async () => '',
          existsSync: (path: string) => path.includes('my-app'), // Target dir exists
          cwd: () => '/test',
          console: mockConsole,
          process: mockProcess,
        })
      ).rejects.toThrow('process.exit(1)');

      expect(mockConsole.error).toHaveBeenCalledWith('Error: Directory "my-app" already exists');
    });

    it('should create project with selected resources', async () => {
      const { init } = await importNew();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();

      let cpSyncFilter: ((src: string) => boolean) | null = null;
      let writtenPkg: { name: string; dependencies?: { sunpeak?: string } } | null = null;
      const renamedFiles: Array<{ from: string; to: string }> = [];

      await init('my-project', 'carousel', {
        discoverResources: () => ['carousel', 'review', 'map'],
        detectPackageManager: () => 'pnpm',
        existsSync: (path: string) => {
          // Target dir doesn't exist, but dotfiles do
          if (path === '/test/my-project') return false;
          if (path.includes('_gitignore')) return true;
          if (path.includes('_prettierignore')) return true;
          if (path.includes('_prettierrc')) return true;
          return false;
        },
        mkdirSync: vi.fn(),
        cpSync: (_src: string, _dest: string, options: { filter: (src: string) => boolean }) => {
          cpSyncFilter = options.filter;
        },
        readFileSync: (path: string) => {
          if (path.includes('package.json') && path.includes('my-project')) {
            return JSON.stringify({ name: 'template', dependencies: { sunpeak: 'workspace:*' } });
          }
          return JSON.stringify({ version: '1.0.0' });
        },
        writeFileSync: (_path: string, content: string) => {
          writtenPkg = JSON.parse(content);
        },
        renameSync: (from: string, to: string) => {
          renamedFiles.push({ from, to });
        },
        execSync: vi.fn(),
        cwd: () => '/test',
        templateDir: '/template',
        rootPkgPath: '/root/package.json',
        console: mockConsole,
        process: mockProcess,
      });

      // Verify filter excludes non-selected resources
      expect(cpSyncFilter).not.toBeNull();
      expect(cpSyncFilter!('/template/src/resources/carousel')).toBe(true);
      expect(cpSyncFilter!('/template/src/resources/review')).toBe(false);
      expect(cpSyncFilter!('/template/src/resources/map')).toBe(false);

      // Verify filter excludes simulations for non-selected resources
      expect(cpSyncFilter!('/template/tests/simulations/carousel')).toBe(true);
      expect(cpSyncFilter!('/template/tests/simulations/review')).toBe(false);
      expect(cpSyncFilter!('/template/tests/simulations/map')).toBe(false);

      // Verify filter excludes e2e tests for non-selected resources
      expect(cpSyncFilter!('/template/tests/e2e/carousel.spec.ts')).toBe(true);
      expect(cpSyncFilter!('/template/tests/e2e/review.spec.ts')).toBe(false);
      expect(cpSyncFilter!('/template/tests/e2e/map.spec.ts')).toBe(false);

      // Verify filter always excludes node_modules and lock file
      expect(cpSyncFilter!('/template/node_modules')).toBe(false);
      expect(cpSyncFilter!('/template/pnpm-lock.yaml')).toBe(false);

      // Verify package.json was updated
      expect(writtenPkg).not.toBeNull();
      expect(writtenPkg!.name).toBe('my-project');
      expect(writtenPkg!.dependencies?.sunpeak).toBe('^1.0.0');

      // Verify dotfiles were renamed
      expect(renamedFiles).toContainEqual({
        from: '/test/my-project/_gitignore',
        to: '/test/my-project/.gitignore',
      });

      // Verify success message
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('Done! To get started'));
    });

    it('should include all resources when none specified', async () => {
      const { init } = await importNew();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();

      let cpSyncFilter: ((src: string) => boolean) | null = null;

      await init('my-project', '', {
        discoverResources: () => ['carousel', 'review'],
        detectPackageManager: () => 'npm',
        prompt: async () => '', // Empty input means "all resources"
        existsSync: () => false,
        mkdirSync: vi.fn(),
        cpSync: (_src: string, _dest: string, options: { filter: (src: string) => boolean }) => {
          cpSyncFilter = options.filter;
        },
        readFileSync: () => JSON.stringify({ version: '1.0.0', name: 'test' }),
        writeFileSync: vi.fn(),
        renameSync: vi.fn(),
        execSync: vi.fn(),
        cwd: () => '/test',
        templateDir: '/template',
        rootPkgPath: '/root/package.json',
        console: mockConsole,
        process: mockProcess,
      });

      // All resources should be included
      expect(cpSyncFilter).not.toBeNull();
      expect(cpSyncFilter!('/template/src/resources/carousel')).toBe(true);
      expect(cpSyncFilter!('/template/src/resources/review')).toBe(true);
    });
  });

  describe('parseResourcesInput', () => {
    it('should return all resources when input is empty', async () => {
      const { parseResourcesInput } = await importNew();

      const result = parseResourcesInput('', ['carousel', 'review', 'map']);
      expect(result).toEqual(['carousel', 'review', 'map']);
    });

    it('should parse comma-separated resources', async () => {
      const { parseResourcesInput } = await importNew();

      const result = parseResourcesInput('carousel,review', ['carousel', 'review', 'map']);
      expect(result).toEqual(['carousel', 'review']);
    });

    it('should parse space-separated resources', async () => {
      const { parseResourcesInput } = await importNew();

      const result = parseResourcesInput('carousel review', ['carousel', 'review', 'map']);
      expect(result).toEqual(['carousel', 'review']);
    });

    it('should handle mixed separators', async () => {
      const { parseResourcesInput } = await importNew();

      const result = parseResourcesInput('carousel, review map', ['carousel', 'review', 'map']);
      expect(result).toEqual(['carousel', 'review', 'map']);
    });

    it('should deduplicate resources', async () => {
      const { parseResourcesInput } = await importNew();

      const result = parseResourcesInput('carousel,carousel,review', ['carousel', 'review', 'map']);
      expect(result).toEqual(['carousel', 'review']);
    });

    it('should be case-insensitive', async () => {
      const { parseResourcesInput } = await importNew();

      const result = parseResourcesInput('CAROUSEL,Review', ['carousel', 'review', 'map']);
      expect(result).toEqual(['carousel', 'review']);
    });

    it('should error on invalid resources', async () => {
      const { parseResourcesInput } = await importNew();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();

      parseResourcesInput('carousel,invalid', ['carousel', 'review'], {
        console: mockConsole,
        process: mockProcess,
      });

      expect(mockConsole.error).toHaveBeenCalledWith('Error: Invalid resource(s): invalid');
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('upgrade command', () => {
    it('should show help when requested', async () => {
      const { upgrade } = await importUpgrade();
      const mockConsole = createMockConsole();

      await upgrade(
        { help: true },
        {
          console: mockConsole,
        }
      );

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('sunpeak upgrade'));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('--check'));
    });

    it('should report when already on latest version', async () => {
      const { upgrade } = await importUpgrade();
      const mockConsole = createMockConsole();

      await upgrade(
        {},
        {
          getCurrentVersion: () => '1.0.0',
          fetchLatestVersion: async () => '1.0.0',
          console: mockConsole,
        }
      );

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('already on the latest version')
      );
    });

    it('should report when newer version is available with --check', async () => {
      const { upgrade } = await importUpgrade();
      const mockConsole = createMockConsole();

      await upgrade(
        { check: true },
        {
          getCurrentVersion: () => '1.0.0',
          fetchLatestVersion: async () => '2.0.0',
          console: mockConsole,
        }
      );

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('New version available')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('2.0.0'));
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Run "sunpeak upgrade" to upgrade')
      );
    });

    it('should upgrade when newer version is available', async () => {
      const { upgrade } = await importUpgrade();
      const mockConsole = createMockConsole();
      let upgradeRan = false;

      await upgrade(
        {},
        {
          getCurrentVersion: () => '1.0.0',
          fetchLatestVersion: async () => '2.0.0',
          detectPackageManager: () => 'npm',
          runUpgrade: async () => {
            upgradeRan = true;
          },
          console: mockConsole,
        }
      );

      expect(upgradeRan).toBe(true);
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Successfully upgraded')
      );
    });

    it('should handle upgrade failure gracefully', async () => {
      const { upgrade } = await importUpgrade();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();

      await upgrade(
        {},
        {
          getCurrentVersion: () => '1.0.0',
          fetchLatestVersion: async () => '2.0.0',
          detectPackageManager: () => 'npm',
          runUpgrade: async () => {
            throw new Error('Network error');
          },
          console: mockConsole,
          process: mockProcess,
        }
      );

      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Error upgrading'));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('manually upgrade'));
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should handle fetch error gracefully', async () => {
      const { upgrade } = await importUpgrade();
      const mockConsole = createMockConsole();
      const mockProcess = createMockProcess();

      await upgrade(
        {},
        {
          getCurrentVersion: () => '1.0.0',
          fetchLatestVersion: async () => {
            throw new Error('Failed to fetch');
          },
          console: mockConsole,
          process: mockProcess,
        }
      );

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Error checking for updates')
      );
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('compareVersions', () => {
    it('should correctly compare semver versions', async () => {
      const { compareVersions } = await importUpgrade();

      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
      expect(compareVersions('1.2.3', '1.2.4')).toBe(-1);
      expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    });
  });

  describe('version command', () => {
    it('should output a valid semver version', async () => {
      const { execSync } = await import('child_process');
      const { join } = await import('path');
      const cliPath = join(process.cwd(), 'bin/sunpeak.js');

      const output = execSync(`node ${cliPath} version`, { encoding: 'utf-8' }).trim();

      // Should be a valid semver version (e.g., "0.9.3")
      expect(output).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should output same version with --version flag', async () => {
      const { execSync } = await import('child_process');
      const { join } = await import('path');
      const cliPath = join(process.cwd(), 'bin/sunpeak.js');

      const versionOutput = execSync(`node ${cliPath} version`, { encoding: 'utf-8' }).trim();
      const flagOutput = execSync(`node ${cliPath} --version`, { encoding: 'utf-8' }).trim();
      const shortFlagOutput = execSync(`node ${cliPath} -v`, { encoding: 'utf-8' }).trim();

      expect(versionOutput).toBe(flagOutput);
      expect(versionOutput).toBe(shortFlagOutput);
    });

    it('should match version in package.json', async () => {
      const { execSync } = await import('child_process');
      const { join } = await import('path');
      const { readFileSync } = await import('fs');
      const cliPath = join(process.cwd(), 'bin/sunpeak.js');
      const pkgPath = join(process.cwd(), 'package.json');

      const output = execSync(`node ${cliPath} version`, { encoding: 'utf-8' }).trim();
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      expect(output).toBe(pkg.version);
    });
  });
});
