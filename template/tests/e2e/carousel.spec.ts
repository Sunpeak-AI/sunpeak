import { test, expect } from '@playwright/test';

test.describe('Carousel Resource', () => {
  test('should load page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('should have interactive elements', async ({ page }) => {
    await page.goto('/');

    const button = page.locator('button').first();
    await expect(button).toBeAttached();
  });
});
