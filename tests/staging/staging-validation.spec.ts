import { test, expect } from '@playwright/test';

test.describe('Staging validation', () => {
  test('should render HTML and styles correctly', async ({ page }) => {
    // Set up console error listener BEFORE navigation
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that React root exists
    const root = page.locator('#root');
    await expect(root).toBeAttached();

    // Check for header with text
    const header = page.locator('header:has-text("SimGPT")');
    await expect(header).toBeVisible();

    // Verify header styles are applied
    const headerStyles = await header.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        alignItems: computed.alignItems,
        display: computed.display,
      };
    });
    expect(headerStyles.display).toBeTruthy();
    expect(headerStyles.alignItems).toBe('center');

    // Check for counter resource content (Counter is the only resource in staging test)
    const welcomeHeading = page.locator('h1:has-text("Welcome to Sunpeak!")');
    await expect(welcomeHeading).toBeVisible();

    // Verify the increment button exists and has styling
    const incrementButton = page.locator('button[aria-label="Increment"]');
    await expect(incrementButton).toBeVisible();

    const buttonStyles = await incrementButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        cursor: computed.cursor,
      };
    });
    expect(buttonStyles.cursor).toBe('pointer');

    // Check for no console errors
    expect(errors).toHaveLength(0);
  });
});
