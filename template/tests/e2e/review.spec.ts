import { test, expect } from '@playwright/test';

test.describe('Review Resource', () => {
  test('should render review content', async ({ page }) => {
    await page.goto('/');

    // Review resource renders star ratings or review content
    const content = page.locator('#root');
    await expect(content).not.toBeEmpty();
  });

  test('should have interactive elements', async ({ page }) => {
    await page.goto('/');

    const button = page.locator('button').first();
    await expect(button).toBeAttached();

    const styles = await button.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return { cursor: computed.cursor };
    });

    expect(styles.cursor).toBe('pointer');
  });
});
