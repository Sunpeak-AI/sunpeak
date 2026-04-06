import { test, expect } from 'sunpeak/test';

test('should render carousel cards with correct styles', async ({ mcp }) => {
  const result = await mcp.callTool('show-carousel');
  const app = result.app();

  const card = app.locator('.rounded-2xl').first();
  await expect(card).toBeVisible();

  const styles = await card.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return { borderRadius: computed.borderRadius, cursor: computed.cursor };
  });
  expect(styles.borderRadius).toBe('16px');
  expect(styles.cursor).toBe('pointer');
});

test('should have card with border styling', async ({ mcp }) => {
  const result = await mcp.callTool('show-carousel');
  const app = result.app();

  const card = app.locator('.rounded-2xl.border').first();
  await expect(card).toBeVisible();

  const styles = await card.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return { borderWidth: computed.borderWidth, borderStyle: computed.borderStyle };
  });
  expect(styles.borderWidth).toBe('1px');
  expect(styles.borderStyle).toBe('solid');
});

test('should have interactive buttons', async ({ mcp }) => {
  const result = await mcp.callTool('show-carousel');
  const app = result.app();

  const visitButton = app.locator('button:has-text("Visit")').first();
  await expect(visitButton).toBeAttached();

  const styles = await visitButton.evaluate((el) => ({
    cursor: window.getComputedStyle(el).cursor,
  }));
  expect(styles.cursor).toBe('pointer');
});

test('should show empty state with Run button in prod tools mode', async ({ mcp }) => {
  await mcp.openTool('show-carousel', { theme: 'dark' });

  await expect(mcp.page.locator('text=Press Run to call the tool')).toBeVisible();
  await expect(mcp.page.locator('button:has-text("Run")')).toBeVisible();
  await expect(mcp.page.locator('iframe')).not.toBeAttached();
});

test('should have themed empty state colors in light mode', async ({ mcp }) => {
  await mcp.openTool('show-carousel', { theme: 'light' });

  const emptyState = mcp.page.locator('text=Press Run to call the tool');
  await expect(emptyState).toBeVisible();

  const color = await emptyState.evaluate((el) => window.getComputedStyle(el).color);
  const [r, g, b] = color.match(/\d+/g)!.map(Number);
  expect(r + g + b).toBeLessThan(600);
});

test('should have themed empty state colors in dark mode', async ({ mcp }) => {
  await mcp.openTool('show-carousel', { theme: 'dark' });

  const emptyState = mcp.page.locator('text=Press Run to call the tool');
  await expect(emptyState).toBeVisible();

  const color = await emptyState.evaluate((el) => window.getComputedStyle(el).color);
  const [r, g, b] = color.match(/\d+/g)!.map(Number);
  expect(r + g + b).toBeGreaterThan(200);
});

test('should activate prod resources mode without errors', async ({ mcp }) => {
  await mcp.callTool('show-carousel', {}, { theme: 'dark', prodResources: true });
  const root = mcp.page.locator('#root');
  await expect(root).not.toBeEmpty();
});

test('should render correctly in fullscreen', async ({ mcp }) => {
  await mcp.callTool('show-carousel', {}, { displayMode: 'fullscreen' });
  await mcp.page.waitForLoadState('networkidle');
  const root = mcp.page.locator('#root');
  await expect(root).not.toBeEmpty();
});

test('should show detail view with place info in fullscreen', async ({ mcp }) => {
  const result = await mcp.callTool('show-carousel', {}, { displayMode: 'fullscreen' });
  const app = result.app();

  const card = app.locator('.rounded-2xl').first();
  await expect(card).toBeVisible();
  await card.click();

  await expect(app.locator('h1:has-text("Lady Bird Lake")')).toBeVisible({ timeout: 5000 });
  await expect(app.locator('text=Highlights')).toBeVisible();
  await expect(app.locator('text=Tips')).toBeVisible();
});

test('should show detail view when Learn More is clicked', async ({ mcp }) => {
  const result = await mcp.callTool('show-carousel', {}, { displayMode: 'fullscreen' });
  const app = result.app();

  const learnMore = app.locator('button:has-text("Learn More")').first();
  await expect(learnMore).toBeVisible();
  await learnMore.click();

  await expect(app.locator('h1:has-text("Lady Bird Lake")')).toBeVisible({ timeout: 5000 });
  await expect(app.locator('text=Address')).toBeVisible();
});

test('should not have a back button in detail view', async ({ mcp }) => {
  const result = await mcp.callTool('show-carousel', {}, { displayMode: 'fullscreen' });
  const app = result.app();

  const card = app.locator('.rounded-2xl').first();
  await expect(card).toBeVisible();
  await card.click();

  await expect(app.locator('h1:has-text("Lady Bird Lake")')).toBeVisible({ timeout: 5000 });
  const backButton = app.locator('button[aria-label="Back to carousel"]');
  await expect(backButton).not.toBeAttached();
});

test('should center the hero image without stretching', async ({ mcp }) => {
  const result = await mcp.callTool('show-carousel', {}, { displayMode: 'fullscreen' });
  const app = result.app();

  const card = app.locator('.rounded-2xl').first();
  await expect(card).toBeVisible();
  await card.click();

  await expect(app.locator('h1:has-text("Lady Bird Lake")')).toBeVisible({ timeout: 5000 });
  const imageContainer = app.locator('img').first().locator('..');
  const styles = await imageContainer.evaluate((el) => ({
    justifyContent: window.getComputedStyle(el).justifyContent,
  }));
  expect(styles.justifyContent).toBe('center');
});

test('should render carousel in dark mode with correct styles', async ({ mcp }) => {
  const result = await mcp.callTool('show-carousel', {}, { theme: 'dark' });
  const app = result.app();

  const card = app.locator('.rounded-2xl').first();
  await expect(card).toBeVisible();

  const styles = await card.evaluate((el) => ({
    borderRadius: window.getComputedStyle(el).borderRadius,
    cursor: window.getComputedStyle(el).cursor,
  }));
  expect(styles.borderRadius).toBe('16px');
  expect(styles.cursor).toBe('pointer');
});

test('should have appropriate dark mode styling', async ({ mcp }) => {
  const result = await mcp.callTool('show-carousel', {}, { theme: 'dark' });
  const app = result.app();

  const card = app.locator('.rounded-2xl.border').first();
  await expect(card).toBeVisible();

  const styles = await card.evaluate((el) => ({
    borderWidth: window.getComputedStyle(el).borderWidth,
    borderStyle: window.getComputedStyle(el).borderStyle,
  }));
  expect(styles.borderWidth).toBe('1px');
  expect(styles.borderStyle).toBe('solid');
});

test('should load without console errors in dark mode', async ({ mcp }) => {
  const errors: string[] = [];
  mcp.page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const result = await mcp.callTool('show-carousel', {}, { theme: 'dark' });
  const app = result.app();
  await expect(app.locator('.rounded-2xl').first()).toBeVisible();

  const unexpectedErrors = errors.filter(
    (e) =>
      !e.includes('[IframeResource]') &&
      !e.includes('mcp') &&
      !e.includes('PostMessage') &&
      !e.includes('connect')
  );
  expect(unexpectedErrors).toHaveLength(0);
});
