import { describe, it, expect } from 'vitest';
import handler, { tool, schema } from './review-diff';

const extra = {} as Parameters<typeof handler>[1];

describe('review-diff tool', () => {
  it('exports correct tool config', () => {
    expect(tool.resource).toBe('review');
    expect(tool.title).toBe('Diff Review');
    expect(tool.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
  });

  it('has expected schema fields', () => {
    expect(schema.changesetId).toBeDefined();
    expect(schema.title).toBeDefined();
    expect(schema.description).toBeDefined();
    expect(schema.files).toBeDefined();
    expect(schema.runMigrations).toBeDefined();
  });

  it('returns structured content with default values', async () => {
    const result = await handler(
      { changesetId: '', title: '', description: '', files: [], runMigrations: false },
      extra
    );
    expect(result.structuredContent.title).toBe('Code Review');
    expect(result.structuredContent.description).toBe('Review the proposed changes below');
    expect(result.structuredContent.reviewTool).toBeDefined();
  });

  it('creates changes from provided files', async () => {
    const result = await handler(
      {
        changesetId: 'cs-42',
        title: 'Fix Bug',
        description: 'Fixes the login bug',
        files: ['src/auth.ts', 'src/login.tsx'],
        runMigrations: false,
      },
      extra
    );
    expect(result.structuredContent.title).toBe('Fix Bug');
    const changes = result.structuredContent.sections[0].content;
    expect(changes).toHaveLength(2);
    expect(changes[0].path).toBe('src/auth.ts');
    expect(changes[1].path).toBe('src/login.tsx');
  });

  it('adds migration action when runMigrations is true', async () => {
    const result = await handler(
      {
        changesetId: 'cs-1',
        title: '',
        description: '',
        files: ['src/app.ts'],
        runMigrations: true,
      },
      extra
    );
    const changes = result.structuredContent.sections[0].content;
    expect(changes).toHaveLength(2);
    expect(changes[1].type).toBe('action');
    expect(changes[1].description).toContain('migrations');
  });

  it('passes changesetId to reviewTool arguments', async () => {
    const result = await handler(
      { changesetId: 'cs-99', title: '', description: '', files: [], runMigrations: false },
      extra
    );
    expect(result.structuredContent.reviewTool.arguments.changesetId).toBe('cs-99');
  });
});
