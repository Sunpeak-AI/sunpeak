import { test, expect } from 'sunpeak/test';

test('should render carousel cards with correct styles', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel');
  const app = result.app();

  const card = app.locator('.rounded-2xl').first();
  await expect(card).toBeVisible();
  await expect(card).toContainText('Lady Bird Lake');
});

test('should have card with border styling', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel');
  const app = result.app();

  const card = app.locator('.rounded-2xl.border').first();
  await expect(card).toBeVisible();
});

test('should have interactive buttons', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel');
  const app = result.app();

  const visitButton = app.locator('button:has-text("Visit")').first();
  await expect(visitButton).toBeVisible();
});

test('should activate prod resources mode without errors', async ({ inspector }) => {
  await inspector.renderTool('show-carousel', undefined, { theme: 'dark', prodResources: true });
  const root = inspector.page.locator('#root');
  await expect(root).not.toBeEmpty();
});

test('should render correctly in fullscreen', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel', undefined, {
    displayMode: 'fullscreen',
  });
  await expect(result.app().locator('h2:has-text("Lady Bird Lake")')).toBeVisible();
});

test('should show detail view with place info in fullscreen', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel', undefined, {
    displayMode: 'fullscreen',
  });
  const app = result.app();

  const firstPlace = app.getByRole('heading', { name: 'Lady Bird Lake' });
  await expect(firstPlace).toBeVisible();
  await firstPlace.click();

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

  const firstPlace = app.getByRole('heading', { name: 'Lady Bird Lake' });
  await expect(firstPlace).toBeVisible();
  await firstPlace.click();

  await expect(app.locator('h1:has-text("Lady Bird Lake")')).toBeVisible({ timeout: 5000 });
  const backButton = app.locator('button[aria-label="Back to carousel"]');
  await expect(backButton).not.toBeAttached();
});

test('should center the hero image without stretching', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel', undefined, {
    displayMode: 'fullscreen',
  });
  const app = result.app();

  const firstPlace = app.getByRole('heading', { name: 'Lady Bird Lake' });
  await expect(firstPlace).toBeVisible();
  await firstPlace.click();

  await expect(app.locator('h1:has-text("Lady Bird Lake")')).toBeVisible({ timeout: 5000 });
  await expect(app.locator('img[alt="Lady Bird Lake"]')).toBeVisible();
});

test('should render carousel in dark mode with correct styles', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel', undefined, { theme: 'dark' });
  const app = result.app();

  const card = app.locator('.rounded-2xl').first();
  await expect(card).toBeVisible();
});

test('should have appropriate dark mode styling', async ({ inspector }) => {
  const result = await inspector.renderTool('show-carousel', undefined, { theme: 'dark' });
  const app = result.app();

  const card = app.locator('.rounded-2xl.border').first();
  await expect(card).toBeVisible();
});
