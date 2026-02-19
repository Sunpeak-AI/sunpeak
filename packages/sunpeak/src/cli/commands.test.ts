/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - CLI command modules are .mjs files without TypeScript declarations
import { describe, it, expect, vi } from 'vitest';

// Helper functions to import CLI modules dynamically
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
