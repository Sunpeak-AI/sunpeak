import { test, expect } from 'sunpeak/test';

// Visual regression tests. Screenshot comparisons only run with `sunpeak test --visual`.
// Update baselines with `sunpeak test --visual --update`.

test('albums renders correctly in light mode', async ({ inspector }) => {
  const result = await inspector.renderTool('show-albums', undefined, { theme: 'light' });
  const app = result.app();
  await expect(app.locator('button:has-text("Summer Slice")')).toBeVisible();

  await result.screenshot('albums-light');
});

test('albums renders correctly in dark mode', async ({ inspector }) => {
  const result = await inspector.renderTool('show-albums', undefined, { theme: 'dark' });
  const app = result.app();
  await expect(app.locator('button:has-text("Summer Slice")')).toBeVisible();

  await result.screenshot('albums-dark');
});

test('albums renders correctly in fullscreen', async ({ inspector }) => {
  const result = await inspector.renderTool('show-albums', undefined, {
    displayMode: 'fullscreen',
  });
  const app = result.app();
  await expect(app.locator('button:has-text("Summer Slice")')).toBeVisible();

  await result.screenshot('albums-fullscreen');
});

test('full page renders correctly', async ({ inspector }) => {
  const result = await inspector.renderTool('show-albums', undefined, { theme: 'light' });
  const app = result.app();
  await expect(app.locator('button:has-text("Summer Slice")')).toBeVisible();

  await result.screenshot('albums-page-light', { target: 'page', maxDiffPixelRatio: 0.02 });
});
