import { test, expect } from '@playwright/test';

test.describe('Dev Server', () => {
  test('should load the home page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveTitle('');
    expect(errors).toHaveLength(0);
  });

  test('should have React root element', async ({ page }) => {
    await page.goto('/');
    const root = page.locator('#root');
    await expect(root).toBeAttached();
  });

  test('should render ChatGPT simulator header', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header:has-text("SimGPT")');
    await expect(header).toBeVisible();
  });
});
