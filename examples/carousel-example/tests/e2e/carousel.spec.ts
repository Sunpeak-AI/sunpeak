import { test, expect } from 'sunpeak/test';

test('should render carousel cards with correct styles', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel');
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

test('should have card with border styling', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel');
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

test('should have interactive buttons', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel');
  const app = result.app();

  const visitButton = app.locator('button:has-text("Visit")').first();
  await expect(visitButton).toBeAttached();

  const styles = await visitButton.evaluate((el) => ({
    cursor: window.getComputedStyle(el).cursor,
  }));
  expect(styles.cursor).toBe('pointer');
});

test('should activate prod resources mode without errors', async ({ inspector }) => {
  await inspector.renderTool('show-carousel', undefined, { theme: 'dark', prodResources: true });
  const root = inspector.page.locator('#root');
  await expect(root).not.toBeEmpty();
});

test('should render correctly in fullscreen', async ({ inspector }) => {
  await inspector.renderTool('show-carousel', undefined, { displayMode: 'fullscreen' });
  await inspector.page.waitForLoadState('networkidle');
  const root = inspector.page.locator('#root');
  await expect(root).not.toBeEmpty();
});

test('should show detail view with place info in fullscreen', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel', undefined, {
    displayMode: 'fullscreen',
  });
  const app = result.app();

  const card = app.locator('.rounded-2xl').first();
  await expect(card).toBeVisible();
  await card.click();

  await expect(app.locator('h1:has-text("Lady Bird Lake")')).toBeVisible({ timeout: 5000 });
  await expect(app.locator('text=Highlights')).toBeVisible();
  await expect(app.locator('text=Tips')).toBeVisible();
});

test('should show detail view when Learn More is clicked', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel', undefined, {
    displayMode: 'fullscreen',
  });
  const app = result.app();

  const learnMore = app.locator('button:has-text("Learn More")').first();
  await expect(learnMore).toBeVisible();
  await learnMore.click();

  await expect(app.locator('h1:has-text("Lady Bird Lake")')).toBeVisible({ timeout: 5000 });
  await expect(app.locator('text=Address')).toBeVisible();
});

test('should not have a back button in detail view', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel', undefined, {
    displayMode: 'fullscreen',
  });
  const app = result.app();

  const card = app.locator('.rounded-2xl').first();
  await expect(card).toBeVisible();
  await card.click();

  await expect(app.locator('h1:has-text("Lady Bird Lake")')).toBeVisible({ timeout: 5000 });
  const backButton = app.locator('button[aria-label="Back to carousel"]');
  await expect(backButton).not.toBeAttached();
});

test('should center the hero image without stretching', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel', undefined, {
    displayMode: 'fullscreen',
  });
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

test('should render carousel in dark mode with correct styles', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel', undefined, { theme: 'dark' });
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

test('should have appropriate dark mode styling', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel', undefined, { theme: 'dark' });
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

test('should load without console errors in dark mode', async ({ inspector }) => {
  const errors: string[] = [];
  inspector.page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const result = await inspector.renderTool('show-carousel', undefined, { theme: 'dark' });
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
