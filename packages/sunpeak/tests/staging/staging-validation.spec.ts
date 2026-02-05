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
    const header = page.locator('header:has-text("sunpeak.ai")');
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

    // Check for review resource content (Review is the only resource in staging test)
    // Resource content renders inside an iframe
    const iframe = page.frameLocator('iframe');

    // All review simulations have an h1 title and a Cancel button
    const reviewHeading = iframe.locator('h1');
    await expect(reviewHeading).toBeVisible();

    // Verify the cancel button exists and has styling (all review simulations have Cancel)
    const cancelButton = iframe.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeVisible();

    const buttonStyles = await cancelButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        cursor: computed.cursor,
      };
    });
    expect(buttonStyles.cursor).toBe('pointer');

    // Check for no console errors (filter expected iframe/MCP handshake errors)
    const unexpectedErrors = errors.filter(
      (e) =>
        !e.includes('[IframeResource]') &&
        !e.includes('mcp') &&
        !e.includes('PostMessage') &&
        !e.includes('connect')
    );
    expect(unexpectedErrors).toHaveLength(0);
  });
});
