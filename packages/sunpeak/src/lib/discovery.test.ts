import { describe, it, expect } from 'vitest';
import {
  toPascalCase,
  extractResourceKey,
  extractSimulationKey,
  findResourceKey,
  getComponentName,
  findResourceDirs,
  findToolFiles,
  findSimulationFilesFlat,
} from './discovery';
import type { FsOps } from './discovery';

describe('toPascalCase', () => {
  it('converts single word', () => {
    expect(toPascalCase('review')).toBe('Review');
  });

  it('converts kebab-case', () => {
    expect(toPascalCase('album-art')).toBe('AlbumArt');
  });

  it('converts multi-segment', () => {
    expect(toPascalCase('my-cool-component')).toBe('MyCoolComponent');
  });
});

describe('extractResourceKey', () => {
  it('extracts from simple path', () => {
    expect(extractResourceKey('./albums/albums.tsx')).toBe('albums');
  });

  it('extracts from nested path', () => {
    expect(extractResourceKey('../src/resources/carousel/carousel.tsx')).toBe('carousel');
  });

  it('returns undefined for non-tsx files', () => {
    expect(extractResourceKey('./albums/albums.ts')).toBeUndefined();
  });
});

describe('extractSimulationKey', () => {
  it('extracts from simple path', () => {
    expect(extractSimulationKey('./show-albums.json')).toBe('show-albums');
  });

  it('returns undefined for non-json files', () => {
    expect(extractSimulationKey('./show-albums.ts')).toBeUndefined();
  });
});

describe('findResourceKey', () => {
  it('matches exact resource name', () => {
    expect(findResourceKey('albums', ['albums', 'review'])).toBe('albums');
  });

  it('matches prefix with dash separator', () => {
    expect(findResourceKey('review-diff', ['review', 'carousel'])).toBe('review');
  });

  it('returns longest matching prefix', () => {
    expect(findResourceKey('review-diff', ['review', 'review-diff'])).toBe('review-diff');
  });

  it('returns undefined when no match', () => {
    expect(findResourceKey('unknown', ['albums', 'review'])).toBeUndefined();
  });

  it('does not match partial prefix without dash', () => {
    expect(findResourceKey('reviews', ['review'])).toBeUndefined();
  });
});

describe('getComponentName', () => {
  it('converts simple name', () => {
    expect(getComponentName('review')).toBe('ReviewResource');
  });

  it('converts kebab-case name', () => {
    expect(getComponentName('album-art')).toBe('AlbumArtResource');
  });
});

describe('findResourceDirs', () => {
  function mockFs(dirs: Record<string, string[]>): FsOps {
    return {
      existsSync: (p: string) => {
        // Check if it's a known directory or a file in a known directory
        if (dirs[p]) return true;
        for (const [dir, files] of Object.entries(dirs)) {
          for (const file of files) {
            if (p === `${dir}/${file}`) return true;
          }
        }
        return false;
      },
      readdirSync: (_p: string) => {
        const entries = dirs[_p];
        if (!entries) return [];
        return entries.map((name) => ({
          name,
          isDirectory: () => !name.includes('.'),
        }));
      },
    };
  }

  it('discovers resource directories with matching files', () => {
    const fs = mockFs({
      'src/resources': ['albums', 'carousel'],
      'src/resources/albums': ['albums.tsx'],
      'src/resources/carousel': ['carousel.tsx'],
    });

    const result = findResourceDirs('src/resources', (key) => `${key}.tsx`, fs);
    expect(result).toEqual([
      {
        key: 'albums',
        dir: 'src/resources/albums',
        resourcePath: 'src/resources/albums/albums.tsx',
      },
      {
        key: 'carousel',
        dir: 'src/resources/carousel',
        resourcePath: 'src/resources/carousel/carousel.tsx',
      },
    ]);
  });

  it('skips directories without matching files', () => {
    const fs = mockFs({
      'src/resources': ['albums', 'empty'],
      'src/resources/albums': ['albums.tsx'],
      'src/resources/empty': [],
    });

    const result = findResourceDirs('src/resources', (key) => `${key}.tsx`, fs);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('albums');
  });

  it('returns empty array for missing directory', () => {
    const fs = mockFs({});
    const result = findResourceDirs('nonexistent', (key) => `${key}.tsx`, fs);
    expect(result).toEqual([]);
  });
});

describe('findToolFiles', () => {
  it('discovers tool files', () => {
    const fs: Pick<FsOps, 'readdirSync' | 'existsSync'> = {
      existsSync: () => true,
      readdirSync: () => [
        { name: 'show-albums.ts', isDirectory: () => false },
        { name: 'show-albums.test.ts', isDirectory: () => false },
        { name: 'review.ts', isDirectory: () => false },
        { name: 'helpers', isDirectory: () => true },
      ],
    };

    const result = findToolFiles('src/tools', fs);
    expect(result).toEqual([
      { name: 'show-albums', path: 'src/tools/show-albums.ts' },
      { name: 'review', path: 'src/tools/review.ts' },
    ]);
  });

  it('returns empty for missing directory', () => {
    const fs: Pick<FsOps, 'readdirSync' | 'existsSync'> = {
      existsSync: () => false,
      readdirSync: () => [],
    };
    expect(findToolFiles('nonexistent', fs)).toEqual([]);
  });
});

describe('findSimulationFilesFlat', () => {
  it('discovers JSON simulation files', () => {
    const fs: Pick<FsOps, 'readdirSync' | 'existsSync'> = {
      existsSync: () => true,
      readdirSync: () => [
        { name: 'show-albums.json', isDirectory: () => false },
        { name: 'review-diff.json', isDirectory: () => false },
        { name: 'readme.md', isDirectory: () => false },
        { name: 'fixtures', isDirectory: () => true },
      ],
    };

    const result = findSimulationFilesFlat('tests/simulations', fs);
    expect(result).toEqual([
      { name: 'show-albums', path: 'tests/simulations/show-albums.json' },
      { name: 'review-diff', path: 'tests/simulations/review-diff.json' },
    ]);
  });

  it('returns empty for missing directory', () => {
    const fs: Pick<FsOps, 'readdirSync' | 'existsSync'> = {
      existsSync: () => false,
      readdirSync: () => [],
    };
    expect(findSimulationFilesFlat('nonexistent', fs)).toEqual([]);
  });
});
