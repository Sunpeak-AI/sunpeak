import { test, expect } from 'sunpeak/test';

test('should render map container with correct styles', async ({ mcp }) => {
  const result = await mcp.callTool('show-map');
  const app = result.app();

  const mapContainer = app.locator('.antialiased.w-full.overflow-hidden').first();
  await expect(mapContainer).toBeVisible({ timeout: 10000 });

  const styles = await mapContainer.evaluate((el) => ({
    overflow: window.getComputedStyle(el).overflow,
  }));
  expect(styles.overflow).toBe('hidden');
});

test('should have rounded border in inline mode', async ({ mcp }) => {
  const result = await mcp.callTool('show-map', {}, { displayMode: 'inline' });
  const app = result.app();

  const innerContainer = app.locator('.border.rounded-2xl').first();
  await expect(innerContainer).toBeVisible({ timeout: 10000 });

  const styles = await innerContainer.evaluate((el) => ({
    borderRadius: window.getComputedStyle(el).borderRadius,
  }));
  expect(parseInt(styles.borderRadius)).toBeGreaterThanOrEqual(16);
});

test('should have fullscreen expand button in inline mode', async ({ mcp }) => {
  const result = await mcp.callTool('show-map', {}, { displayMode: 'inline' });
  const app = result.app();

  const expandButton = app.locator('button[aria-label="Enter fullscreen"]');
  await expect(expandButton).toBeVisible({ timeout: 10000 });

  const styles = await expandButton.evaluate((el) => ({
    cursor: window.getComputedStyle(el).cursor,
    position: window.getComputedStyle(el).position,
  }));
  expect(styles.cursor).toBe('pointer');
  expect(styles.position).toBe('absolute');
});

test('should load without console errors in light mode', async ({ mcp }) => {
  const errors: string[] = [];
  mcp.page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const result = await mcp.callTool('show-map');
  const app = result.app();
  await expect(app.locator('.antialiased.w-full.overflow-hidden').first()).toBeVisible({
    timeout: 10000,
  });

  const unexpectedErrors = errors.filter(
    (e) =>
      !e.includes('[IframeResource]') &&
      !e.includes('mcp') &&
      !e.includes('PostMessage') &&
      !e.includes('connect')
  );
  expect(unexpectedErrors).toHaveLength(0);
});

test('should show empty state with Run button in prod tools mode', async ({ mcp }) => {
  await mcp.openTool('show-map', { theme: 'dark' });

  await expect(mcp.page.locator('text=Press Run to call the tool')).toBeVisible();
  await expect(mcp.page.locator('button:has-text("Run")')).toBeVisible();
  await expect(mcp.page.locator('iframe')).not.toBeAttached();
});

test('should have themed empty state colors in light mode', async ({ mcp }) => {
  await mcp.openTool('show-map', { theme: 'light' });

  const emptyState = mcp.page.locator('text=Press Run to call the tool');
  await expect(emptyState).toBeVisible();

  const color = await emptyState.evaluate((el) => window.getComputedStyle(el).color);
  const [r, g, b] = color.match(/\d+/g)!.map(Number);
  expect(r + g + b).toBeLessThan(600);
});

test('should have themed empty state colors in dark mode', async ({ mcp }) => {
  await mcp.openTool('show-map', { theme: 'dark' });

  const emptyState = mcp.page.locator('text=Press Run to call the tool');
  await expect(emptyState).toBeVisible();

  const color = await emptyState.evaluate((el) => window.getComputedStyle(el).color);
  const [r, g, b] = color.match(/\d+/g)!.map(Number);
  expect(r + g + b).toBeGreaterThan(200);
});

test('should activate prod resources mode without errors', async ({ mcp }) => {
  await mcp.callTool('show-map', {}, { theme: 'dark', prodResources: true });
  const root = mcp.page.locator('#root');
  await expect(root).not.toBeEmpty();
});

test('should render map in dark mode', async ({ mcp }) => {
  const result = await mcp.callTool('show-map', {}, { theme: 'dark' });
  const app = result.app();
  await expect(app.locator('.antialiased.w-full.overflow-hidden').first()).toBeVisible({
    timeout: 10000,
  });
});

test('should have appropriate border color in dark mode', async ({ mcp }) => {
  const result = await mcp.callTool('show-map', {}, { theme: 'dark', displayMode: 'inline' });
  const app = result.app();

  const innerContainer = app.locator('.border.rounded-2xl').first();
  await expect(innerContainer).toBeVisible({ timeout: 10000 });

  const styles = await innerContainer.evaluate((el) => ({
    borderColor: window.getComputedStyle(el).borderColor,
  }));
  expect(styles.borderColor).toBeTruthy();
});

test('should load without console errors in dark mode', async ({ mcp }) => {
  const errors: string[] = [];
  mcp.page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const result = await mcp.callTool('show-map', {}, { theme: 'dark' });
  const app = result.app();
  await expect(app.locator('.antialiased.w-full.overflow-hidden').first()).toBeVisible({
    timeout: 10000,
  });

  const unexpectedErrors = errors.filter(
    (e) =>
      !e.includes('[IframeResource]') &&
      !e.includes('mcp') &&
      !e.includes('PostMessage') &&
      !e.includes('connect')
  );
  expect(unexpectedErrors).toHaveLength(0);
});

test('should not have rounded border in fullscreen mode', async ({ mcp }) => {
  const result = await mcp.callTool('show-map', {}, { displayMode: 'fullscreen' });
  const app = result.app();

  const innerContainer = app.locator('.rounded-none.border-0').first();
  await expect(innerContainer).toBeVisible({ timeout: 10000 });

  const styles = await innerContainer.evaluate((el) => ({
    borderRadius: window.getComputedStyle(el).borderRadius,
  }));
  expect(styles.borderRadius).toBe('0px');
});

test('should not show fullscreen button in fullscreen mode', async ({ mcp }) => {
  const result = await mcp.callTool('show-map', {}, { displayMode: 'fullscreen' });
  const app = result.app();

  await expect(app.locator('.antialiased.w-full.overflow-hidden').first()).toBeVisible({
    timeout: 10000,
  });
  await expect(app.locator('button[aria-label="Enter fullscreen"]')).not.toBeVisible();
});

test('should show suggestion chips in fullscreen on desktop', async ({ mcp }) => {
  await mcp.page.setViewportSize({ width: 1024, height: 768 });

  const result = await mcp.callTool('show-map', {}, { displayMode: 'fullscreen' });
  const app = result.app();

  await expect(app.locator('.antialiased.w-full.overflow-hidden').first()).toBeVisible({
    timeout: 10000,
  });
  await expect(app.locator('button:has-text("Open now")')).toBeAttached({ timeout: 5000 });
});
