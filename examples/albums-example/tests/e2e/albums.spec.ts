import { test, expect } from 'sunpeak/test';

test('should render album cards with correct styles', async ({ inspector }) => {
  const result = await inspector.renderTool('show-albums');
  const app = result.app();

  const albumCard = app.locator('button:has-text("Summer Slice")');
  await expect(albumCard).toBeVisible();
});

test('should have album image with correct aspect ratio', async ({ inspector }) => {
  const result = await inspector.renderTool('show-albums');
  const app = result.app();

  const imageContainer = app.locator('button:has-text("Summer Slice") .aspect-\\[4\\/3\\]');
  await expect(imageContainer).toBeVisible();
});

test('should render album cards in dark mode', async ({ inspector }) => {
  const result = await inspector.renderTool('show-albums', undefined, { theme: 'dark' });
  const app = result.app();

  const albumTitle = app.locator('button:has-text("Summer Slice") div').first();
  await expect(albumTitle).toBeVisible();
});

test('should activate prod resources mode without errors', async ({ inspector }) => {
  await inspector.renderTool('show-albums', undefined, { theme: 'dark', prodResources: true });
  const root = inspector.page.locator('#root');
  await expect(root).not.toBeEmpty();
});

test('should render correctly in fullscreen', async ({ inspector }) => {
  const result = await inspector.renderTool('show-albums', undefined, {
    displayMode: 'fullscreen',
  });
  const app = result.app();

  const albumCard = app.locator('button:has-text("Summer Slice")');
  await expect(albumCard).toBeVisible();
});

test('should render content in fullscreen mode', async ({ inspector }) => {
  const result = await inspector.renderTool('show-albums', undefined, {
    theme: 'dark',
    displayMode: 'fullscreen',
  });
  const app = result.app();
  await expect(app.locator('button:has-text("Summer Slice")')).toBeVisible();
});

test('should render content in PiP mode', async ({ inspector }) => {
  test.skip(inspector.host === 'claude', 'Claude does not support PiP');

  const result = await inspector.renderTool('show-albums', undefined, {
    theme: 'dark',
    displayMode: 'pip',
  });
  const app = result.app();
  await expect(app.locator('button:has-text("Summer Slice")')).toBeVisible();
});
