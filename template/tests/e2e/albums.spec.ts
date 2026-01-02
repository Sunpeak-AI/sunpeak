import { test, expect } from '@playwright/test';

test.describe('Albums Resource', () => {
  test('should render album cards', async ({ page }) => {
    await page.goto('/');

    const albumCard = page.locator('button:has-text("Summer Slice")');
    await expect(albumCard).toBeVisible();
  });

  test('should have interactive album cards with proper styles', async ({ page }) => {
    await page.goto('/');

    const albumCard = page.locator('button:has-text("Summer Slice")');
    const styles = await albumCard.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        cursor: computed.cursor,
        borderRadius: computed.borderRadius,
      };
    });

    expect(styles.cursor).toBe('pointer');
    expect(styles.borderRadius).toBeTruthy();
  });
});
