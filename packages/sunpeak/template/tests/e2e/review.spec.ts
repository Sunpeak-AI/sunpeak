import { test, expect } from 'sunpeak/test';

test('should render review title with correct styles', async ({ inspector }) => {
  const result = await inspector.renderTool('review-diff');
  const app = result.app();

  const title = app.locator('h1:has-text("Refactor Authentication Module")');
  await expect(title).toBeVisible();

  const styles = await title.evaluate((el) => ({
    fontWeight: window.getComputedStyle(el).fontWeight,
  }));
  expect(parseInt(styles.fontWeight)).toBeGreaterThanOrEqual(600);
});

test('should render change items with type-specific styling', async ({ inspector }) => {
  const result = await inspector.renderTool('review-diff');
  const app = result.app();

  const changeItem = app.locator('li').first();
  await expect(changeItem).toBeVisible();

  const styles = await changeItem.evaluate((el) => ({
    backgroundColor: window.getComputedStyle(el).backgroundColor,
  }));
  expect(styles.backgroundColor).toBeTruthy();
  expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
});

test('should have interactive apply and cancel buttons', async ({ inspector }) => {
  const result = await inspector.renderTool('review-diff');
  const app = result.app();

  const applyButton = app.locator('button:has-text("Apply Changes")');
  await expect(applyButton).toBeVisible();
  expect(await applyButton.evaluate((el) => window.getComputedStyle(el).cursor)).toBe('pointer');

  const cancelButton = app.locator('button:has-text("Cancel")');
  await expect(cancelButton).toBeVisible();
  expect(await cancelButton.evaluate((el) => window.getComputedStyle(el).cursor)).toBe('pointer');
});

test('should have expand fullscreen button in inline mode', async ({ inspector }) => {
  const result = await inspector.renderTool('review-diff', undefined, { displayMode: 'inline' });
  const app = result.app();

  const expandButton = app.locator('button[aria-label="Enter fullscreen"]');
  await expect(expandButton).toBeVisible();
  expect(await expandButton.evaluate((el) => window.getComputedStyle(el).cursor)).toBe('pointer');
});

test('should activate prod resources mode without errors', async ({ inspector }) => {
  await inspector.renderTool('review-diff', undefined, { theme: 'dark', prodResources: true });
  const root = inspector.page.locator('#root');
  await expect(root).not.toBeEmpty();
});

test('should render review title in dark mode', async ({ inspector }) => {
  const result = await inspector.renderTool('review-diff', undefined, { theme: 'dark' });
  const app = result.app();
  await expect(app.locator('h1:has-text("Refactor Authentication Module")')).toBeVisible();
});

test('should have appropriate text colors in dark mode', async ({ inspector }) => {
  const result = await inspector.renderTool('review-diff', undefined, { theme: 'dark' });
  const app = result.app();

  const title = app.locator('h1').first();
  await expect(title).toBeVisible();

  const styles = await title.evaluate((el) => ({
    color: window.getComputedStyle(el).color,
  }));
  expect(styles.color).toBeTruthy();
});

test('should render change items in dark mode', async ({ inspector }) => {
  const result = await inspector.renderTool('review-diff', undefined, { theme: 'dark' });
  const app = result.app();
  await expect(app.locator('li').first()).toBeVisible();
});

test('should load without console errors in dark mode', async ({ inspector }) => {
  const errors: string[] = [];
  inspector.page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const result = await inspector.renderTool('review-diff', undefined, { theme: 'dark' });
  const app = result.app();
  await expect(app.locator('h1').first()).toBeVisible();

  const unexpectedErrors = errors.filter(
    (e) =>
      !e.includes('[IframeResource]') &&
      !e.includes('mcp') &&
      !e.includes('PostMessage') &&
      !e.includes('connect')
  );
  expect(unexpectedErrors).toHaveLength(0);
});

test('should not show fullscreen button in fullscreen mode', async ({ inspector }) => {
  const result = await inspector.renderTool('review-diff', undefined, {
    displayMode: 'fullscreen',
  });
  const app = result.app();

  await expect(app.locator('h1').first()).toBeVisible();
  await expect(app.locator('button[aria-label="Enter fullscreen"]')).not.toBeVisible();
});

test('should render content in fullscreen mode', async ({ inspector }) => {
  const result = await inspector.renderTool('review-diff', undefined, {
    theme: 'dark',
    displayMode: 'fullscreen',
  });
  const app = result.app();

  await expect(inspector.page.locator('#root')).not.toBeEmpty();
  await expect(app.locator('h1')).toBeVisible();
});

test('should render post review in light mode', async ({ inspector }) => {
  await inspector.renderTool('review-post');
  await inspector.page.waitForLoadState('networkidle');
  await expect(inspector.page.locator('#root')).not.toBeEmpty();
});

test('should render post review in dark mode', async ({ inspector }) => {
  await inspector.renderTool('review-post', undefined, { theme: 'dark' });
  await inspector.page.waitForLoadState('networkidle');
  await expect(inspector.page.locator('#root')).not.toBeEmpty();
});

test('should show server success message when confirming post', async ({ inspector }) => {
  const result = await inspector.renderTool('review-post', undefined, { theme: 'dark' });
  const app = result.app();

  const publishButton = app.locator('button:has-text("Publish")');
  await expect(publishButton).toBeVisible();
  await publishButton.evaluate((el) => (el as HTMLElement).click());

  await expect(app.locator('text=Completed.')).toBeVisible({ timeout: 10000 });
  await expect(app.locator('text=Publishing post...')).toBeVisible({ timeout: 10000 });
});

test('should show server cancel message when rejecting post', async ({ inspector }) => {
  const result = await inspector.renderTool('review-post', undefined, { theme: 'dark' });
  const app = result.app();

  const cancelButton = app.locator('button:has-text("Cancel")');
  await expect(cancelButton).toBeVisible();
  await cancelButton.evaluate((el) => (el as HTMLElement).click());

  await expect(app.locator('text=Cancelled.')).toBeVisible({ timeout: 10000 });
});

test('should render purchase review in light mode', async ({ inspector }) => {
  await inspector.renderTool('review-purchase');
  await inspector.page.waitForLoadState('networkidle');
  await expect(inspector.page.locator('#root')).not.toBeEmpty();
});

test('should render purchase review in dark mode', async ({ inspector }) => {
  await inspector.renderTool('review-purchase', undefined, { theme: 'dark' });
  await inspector.page.waitForLoadState('networkidle');
  await expect(inspector.page.locator('#root')).not.toBeEmpty();
});

test('should show loading then result when placing order', async ({ inspector }) => {
  const result = await inspector.renderTool('review-purchase');
  const app = result.app();

  const placeOrderButton = app.locator('button:has-text("Place Order")');
  await expect(placeOrderButton).toBeVisible();
  await placeOrderButton.evaluate((el) => (el as HTMLElement).click());

  await expect(app.locator('text=Placing order...')).toBeVisible({ timeout: 10000 });
  await expect(app.locator('text=Completed.')).toBeVisible({ timeout: 10000 });
});

test('should confirm review-diff and show server success', async ({ inspector }) => {
  const result = await inspector.renderTool('review-diff', undefined, { theme: 'dark' });
  const app = result.app();

  const applyButton = app.locator('button:has-text("Apply Changes")');
  await expect(applyButton).toBeVisible();
  await applyButton.evaluate((el) => (el as HTMLElement).click());

  await expect(app.locator('text=Applying changes...')).toBeVisible({ timeout: 10000 });
  await expect(app.locator('text=Completed.')).toBeVisible({ timeout: 10000 });
});

test('should cancel review-diff and show server cancelled', async ({ inspector }) => {
  const result = await inspector.renderTool('review-diff', undefined, { theme: 'dark' });
  const app = result.app();

  const cancelButton = app.locator('button:has-text("Cancel")');
  await expect(cancelButton).toBeVisible();
  await cancelButton.evaluate((el) => (el as HTMLElement).click());

  await expect(app.locator('text=Cancelled.')).toBeVisible({ timeout: 10000 });
});
