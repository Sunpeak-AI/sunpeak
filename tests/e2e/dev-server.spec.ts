import { test, expect } from '@playwright/test';

test.describe('Dev Server', () => {
  test('should load the home page', async ({ page }) => {
    // Set up console listener BEFORE navigation to catch all errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that the page loaded successfully
    await expect(page).not.toHaveTitle('');

    // We expect no errors
    expect(errors).toHaveLength(0);
  });

  test('should have React root element', async ({ page }) => {
    await page.goto('/');

    // Check for common React root element
    const root = page.locator('#root');
    await expect(root).toBeAttached();
  });

  test('should render ChatGPT header with proper styles', async ({ page }) => {
    await page.goto('/');

    // Check for ChatGPT header element
    const header = page.locator('header:has-text("SimGPT")');
    await expect(header).toBeVisible();

    // Verify computed styles to confirm CSS is properly bundled
    const styles = await header.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        alignItems: computed.alignItems,
      };
    });

    // Verify key layout styles are applied
    expect(styles.alignItems).toBe('center');
  });

  test('should render albums with proper styles', async ({ page }) => {
    await page.goto('/');

    // Use specific locator for album card button
    const albumCard = page.locator('button:has-text("Summer Slice")');
    await expect(albumCard).toBeVisible();

    // Verify computed styles to confirm Tailwind classes are applied
    const styles = await albumCard.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        cursor: computed.cursor,
        borderRadius: computed.borderRadius,
      };
    });

    // Verify interactive and styled
    expect(styles.cursor).toBe('pointer');
    expect(styles.borderRadius).toBeTruthy();
  });
});
