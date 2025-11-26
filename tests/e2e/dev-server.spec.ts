import { test, expect } from '@playwright/test';

test.describe('Dev Server', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the page loaded successfully
    await expect(page).not.toHaveTitle('');

    // Verify no console errors (except known warnings)
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Give it a moment to catch any errors
    await page.waitForTimeout(1000);

    // We expect no errors
    expect(errors).toHaveLength(0);
  });

  test('should have React root element', async ({ page }) => {
    await page.goto('/');

    // Check for common React root element
    const root = await page.locator('#root');
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
        borderBottomWidth: computed.borderBottomWidth,
      };
    });

    // Verify key layout styles are applied
    expect(styles.alignItems).toBe('center');
    expect(parseFloat(styles.borderBottomWidth)).toBeGreaterThan(0); // border-b
  });

  test('should render place card with proper typography styles', async ({ page }) => {
    await page.goto('/');

    const placeHeader = page.locator('h1:has-text("Welcome to Sunpeak!")');
    await expect(placeHeader).toBeVisible();

    // Verify computed styles to confirm Tailwind typography classes are applied
    const styles = await placeHeader.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        fontWeight: computed.fontWeight
      };
    });

    // Verify typography styles are applied
    expect(styles.fontWeight).toBe('700'); // font-medium
  });
});
