import { test, expect } from 'sunpeak/test';

// Visual regression tests. Screenshot comparisons only run with `sunpeak test --visual`.
// Update baselines with `sunpeak test --visual --update`.

test('albums renders correctly in light mode', async ({ mcp }) => {
  const result = await mcp.callTool('show-albums', {}, { theme: 'light' });
  const app = result.app();
  await expect(app.locator('button:has-text("Summer Slice")')).toBeVisible();

  await mcp.screenshot('albums-light');
});

test('albums renders correctly in dark mode', async ({ mcp }) => {
  const result = await mcp.callTool('show-albums', {}, { theme: 'dark' });
  const app = result.app();
  await expect(app.locator('button:has-text("Summer Slice")')).toBeVisible();

  await mcp.screenshot('albums-dark');
});

test('albums renders correctly in fullscreen', async ({ mcp }) => {
  const result = await mcp.callTool('show-albums', {}, { displayMode: 'fullscreen' });
  const app = result.app();
  await expect(app.locator('button:has-text("Summer Slice")')).toBeVisible();

  await mcp.screenshot('albums-fullscreen');
});

test('full page renders correctly', async ({ mcp }) => {
  const result = await mcp.callTool('show-albums', {}, { theme: 'light' });
  const app = result.app();
  await expect(app.locator('button:has-text("Summer Slice")')).toBeVisible();

  await mcp.screenshot('albums-page-light', { target: 'page', maxDiffPixelRatio: 0.02 });
});
