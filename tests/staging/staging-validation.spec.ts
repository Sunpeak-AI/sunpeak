import { test, expect } from '@playwright/test';

test.describe('Staging validation', () => {
  test('should render HTML and styles correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that React root exists
    const root = page.locator('#root');
    await expect(root).toBeAttached();

    // Check for header with text
    const header = page.locator('header:has-text("SimGPT")');
    await expect(header).toBeVisible();

    // Verify styles are applied by checking computed styles
    const styles = await header.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        alignItems: computed.alignItems,
        display: computed.display,
      };
    });

    // These styles should be applied from Tailwind/CSS
    expect(styles.display).toBeTruthy();
    expect(styles.alignItems).toBe('center');

    // Check for main content
    const mainContent = page.locator('h1:has-text("Welcome to Sunpeak!")');
    await expect(mainContent).toBeVisible();

    // Verify typography styles
    const typographyStyles = await mainContent.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        fontWeight: computed.fontWeight,
        fontSize: computed.fontSize,
      };
    });

    // Typography should be styled
    expect(typographyStyles.fontWeight).toBe('700');
    expect(typographyStyles.fontSize).toBeTruthy();

    // Check for counter increment button with border radius
    // (Counter is the first/default simulation that loads)
    const incrementButton = page.locator('button[aria-label="Increment"]');
    await expect(incrementButton).toBeVisible();

    // Verify button has border radius styling
    const buttonStyles = await incrementButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        borderRadius: computed.borderRadius,
      };
    });

    // Border radius should be set (not 0px)
    expect(buttonStyles.borderRadius).not.toBe('0px');
    expect(buttonStyles.borderRadius).toBeTruthy();

    // Check for no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});
