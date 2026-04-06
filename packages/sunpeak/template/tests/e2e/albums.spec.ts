import { test, expect } from 'sunpeak/test';

test('should render album cards with correct styles', async ({ mcp }) => {
  const result = await mcp.callTool('show-albums');
  const app = result.app();

  const albumCard = app.locator('button:has-text("Summer Slice")');
  await expect(albumCard).toBeVisible();

  const styles = await albumCard.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return { cursor: computed.cursor, borderRadius: computed.borderRadius };
  });
  expect(styles.cursor).toBe('pointer');
  expect(styles.borderRadius).toBe('12px');
});

test('should have album image with correct aspect ratio', async ({ mcp }) => {
  const result = await mcp.callTool('show-albums');
  const app = result.app();

  const imageContainer = app.locator('button:has-text("Summer Slice") .aspect-\\[4\\/3\\]');
  await expect(imageContainer).toBeVisible();

  const styles = await imageContainer.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return { borderRadius: computed.borderRadius, overflow: computed.overflow };
  });
  expect(styles.borderRadius).toBe('12px');
  expect(styles.overflow).toBe('hidden');
});

test('should render album cards in dark mode', async ({ mcp }) => {
  const result = await mcp.callTool('show-albums', {}, { theme: 'dark' });
  const app = result.app();

  const albumTitle = app.locator('button:has-text("Summer Slice") div').first();
  await expect(albumTitle).toBeVisible();

  const titleStyles = await albumTitle.evaluate((el) => ({
    color: window.getComputedStyle(el).color,
  }));
  expect(titleStyles.color).toBeTruthy();
});

test('should show empty state with Run button in prod tools mode', async ({ mcp }) => {
  await mcp.openTool('show-albums', { theme: 'dark' });

  await expect(mcp.page.locator('text=Press Run to call the tool')).toBeVisible();
  await expect(mcp.page.locator('button:has-text("Run")')).toBeVisible();
  await expect(mcp.page.locator('iframe')).not.toBeAttached();
});

test('should have themed empty state colors in light mode', async ({ mcp }) => {
  await mcp.openTool('show-albums', { theme: 'light' });

  const emptyState = mcp.page.locator('text=Press Run to call the tool');
  await expect(emptyState).toBeVisible();

  const color = await emptyState.evaluate((el) => window.getComputedStyle(el).color);
  const [r, g, b] = color.match(/\d+/g)!.map(Number);
  expect(r + g + b).toBeLessThan(600);
});

test('should have themed empty state colors in dark mode', async ({ mcp }) => {
  await mcp.openTool('show-albums', { theme: 'dark' });

  const emptyState = mcp.page.locator('text=Press Run to call the tool');
  await expect(emptyState).toBeVisible();

  const color = await emptyState.evaluate((el) => window.getComputedStyle(el).color);
  const [r, g, b] = color.match(/\d+/g)!.map(Number);
  expect(r + g + b).toBeGreaterThan(200);
});

test('should activate prod resources mode without errors', async ({ mcp }) => {
  await mcp.callTool('show-albums', {}, { theme: 'dark', prodResources: true });
  const root = mcp.page.locator('#root');
  await expect(root).not.toBeEmpty();
});

test('should render correctly in fullscreen', async ({ mcp }) => {
  const result = await mcp.callTool('show-albums', {}, { displayMode: 'fullscreen' });
  const app = result.app();

  const albumCard = app.locator('button:has-text("Summer Slice")');
  await expect(albumCard).toBeVisible();

  const styles = await albumCard.evaluate((el) => ({
    cursor: window.getComputedStyle(el).cursor,
    borderRadius: window.getComputedStyle(el).borderRadius,
  }));
  expect(styles.cursor).toBe('pointer');
  expect(styles.borderRadius).toBe('12px');
});

test('should preserve content when switching to fullscreen', async ({ mcp }) => {
  const result = await mcp.callTool('show-albums', {}, { theme: 'dark' });
  const app = result.app();
  await expect(app.locator('button:has-text("Summer Slice")')).toBeVisible();

  await mcp.setDisplayMode('fullscreen');
  await expect(app.locator('button:has-text("Summer Slice")')).toBeVisible({ timeout: 5000 });
});

test('should preserve content when switching to PiP', async ({ mcp }) => {
  test.skip(mcp.host === 'claude', 'Claude does not support PiP');

  const result = await mcp.callTool('show-albums', {}, { theme: 'dark' });
  const app = result.app();
  await expect(app.locator('button:has-text("Summer Slice")')).toBeVisible();

  await mcp.setDisplayMode('pip');
  await expect(app.locator('button:has-text("Summer Slice")')).toBeVisible({ timeout: 5000 });
});
