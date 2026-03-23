import { describe, it, expect } from 'vitest';
import handler, { tool, schema } from './review-post';

const extra = {} as Parameters<typeof handler>[1];

describe('review-post tool', () => {
  it('exports correct tool config', () => {
    expect(tool.resource).toBe('review');
    expect(tool.title).toBe('Review Post');
    expect(tool.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
  });

  it('has expected schema fields', () => {
    expect(schema.content).toBeDefined();
    expect(schema.platforms).toBeDefined();
    expect(schema.schedule).toBeDefined();
    expect(schema.visibility).toBeDefined();
  });

  it('returns structured content with defaults', async () => {
    const result = await handler(
      { content: '', platforms: [], schedule: 'now', scheduledTime: '', visibility: 'public' },
      extra
    );
    expect(result.structuredContent.title).toBe('Review Your Post');
    expect(result.structuredContent.acceptLabel).toBe('Publish');
    expect(result.structuredContent.rejectLabel).toBe('Cancel');
  });

  it('includes content in preview section', async () => {
    const result = await handler(
      {
        content: 'Hello world!',
        platforms: ['x'],
        schedule: 'now',
        scheduledTime: '',
        visibility: 'public',
      },
      extra
    );
    const preview = result.structuredContent.sections.find(
      (s: { type: string }) => s.type === 'preview'
    );
    expect(preview?.content).toBe('Hello world!');
  });

  it('joins platform names in details', async () => {
    const result = await handler(
      {
        content: 'Post',
        platforms: ['x', 'linkedin'],
        schedule: 'now',
        scheduledTime: '',
        visibility: 'public',
      },
      extra
    );
    const details = result.structuredContent.sections.find(
      (s: { type: string }) => s.type === 'details'
    );
    const platformDetail = (details?.content as { label: string; value: string }[])?.find(
      (d) => d.label === 'Platforms'
    );
    expect(platformDetail?.value).toBe('x, linkedin');
  });

  it('shows scheduled time when schedule is "scheduled"', async () => {
    const result = await handler(
      {
        content: 'Post',
        platforms: [],
        schedule: 'scheduled',
        scheduledTime: '2025-06-15T10:00:00Z',
        visibility: 'connections',
      },
      extra
    );
    const details = result.structuredContent.sections.find(
      (s: { type: string }) => s.type === 'details'
    );
    const scheduleDetail = (details?.content as { label: string; value: string }[])?.find(
      (d) => d.label === 'Schedule'
    );
    expect(scheduleDetail?.value).not.toBe('Immediately');
  });

  it('shows "Immediately" when schedule is "now"', async () => {
    const result = await handler(
      { content: '', platforms: [], schedule: 'now', scheduledTime: '', visibility: 'public' },
      extra
    );
    const details = result.structuredContent.sections.find(
      (s: { type: string }) => s.type === 'details'
    );
    const scheduleDetail = (details?.content as { label: string; value: string }[])?.find(
      (d) => d.label === 'Schedule'
    );
    expect(scheduleDetail?.value).toBe('Immediately');
  });
});
