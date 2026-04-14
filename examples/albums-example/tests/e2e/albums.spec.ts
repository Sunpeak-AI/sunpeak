import { test, expect } from 'sunpeak/test';

test('should render album cards with correct styles', async ({ inspector }) => {
  const result = await inspector.renderTool('show-albums');
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

test('should have album image with correct aspect ratio', async ({ inspector }) => {
  const result = await inspector.renderTool('show-albums');
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

test('should render album cards in dark mode', async ({ inspector }) => {
  const result = await inspector.renderTool('show-albums', undefined, { theme: 'dark' });
  const app = result.app();

  const albumTitle = app.locator('button:has-text("Summer Slice") div').first();
  await expect(albumTitle).toBeVisible();

  const titleStyles = await albumTitle.evaluate((el) => ({
    color: window.getComputedStyle(el).color,
  }));
  expect(titleStyles.color).toBeTruthy();
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

  const styles = await albumCard.evaluate((el) => ({
    cursor: window.getComputedStyle(el).cursor,
    borderRadius: window.getComputedStyle(el).borderRadius,
  }));
  expect(styles.cursor).toBe('pointer');
  expect(styles.borderRadius).toBe('12px');
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
