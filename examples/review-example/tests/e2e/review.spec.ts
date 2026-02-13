import { test, expect } from '@playwright/test';
import { createSimulatorUrl } from 'sunpeak/chatgpt';

test.describe('Review Resource', () => {
  test.describe('Light Mode', () => {
    test('should render review title with correct styles', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'review-diff', theme: 'light' }));

      const iframe = page.frameLocator('iframe');
      const title = iframe.locator('h1:has-text("Refactor Authentication Module")');
      await expect(title).toBeVisible();

      const styles = await title.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          fontWeight: computed.fontWeight,
        };
      });

      // Should render semibold (600)
      expect(parseInt(styles.fontWeight)).toBeGreaterThanOrEqual(600);
    });

    test('should render change items with type-specific styling', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'review-diff', theme: 'light' }));

      const iframe = page.frameLocator('iframe');
      const changeItem = iframe.locator('li').first();
      await expect(changeItem).toBeVisible();

      const styles = await changeItem.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          borderRadius: computed.borderRadius,
          backgroundColor: computed.backgroundColor,
        };
      });

      // Background should be set (one of the type colors)
      expect(styles.backgroundColor).toBeTruthy();
      expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    test('should have interactive apply and cancel buttons', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'review-diff', theme: 'light' }));

      const iframe = page.frameLocator('iframe');

      // Find the Apply Changes button (based on simulation data)
      const applyButton = iframe.locator('button:has-text("Apply Changes")');
      await expect(applyButton).toBeVisible();

      const applyStyles = await applyButton.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          cursor: computed.cursor,
        };
      });
      expect(applyStyles.cursor).toBe('pointer');

      // Find the Cancel button
      const cancelButton = iframe.locator('button:has-text("Cancel")');
      await expect(cancelButton).toBeVisible();

      const cancelStyles = await cancelButton.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          cursor: computed.cursor,
        };
      });
      expect(cancelStyles.cursor).toBe('pointer');
    });

    test('should have expand fullscreen button in inline mode', async ({ page }) => {
      await page.goto(
        createSimulatorUrl({ simulation: 'review-diff', theme: 'light', displayMode: 'inline' })
      );

      const iframe = page.frameLocator('iframe');
      const expandButton = iframe.locator('button[aria-label="Enter fullscreen"]');
      await expect(expandButton).toBeVisible();

      const styles = await expandButton.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          cursor: computed.cursor,
        };
      });

      expect(styles.cursor).toBe('pointer');
    });
  });

  test.describe('Dark Mode', () => {
    test('should render review title with correct styles', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'review-diff', theme: 'dark' }));

      const iframe = page.frameLocator('iframe');
      const title = iframe.locator('h1:has-text("Refactor Authentication Module")');
      await expect(title).toBeVisible();
    });

    test('should have appropriate text colors for dark mode', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'review-diff', theme: 'dark' }));

      const iframe = page.frameLocator('iframe');
      const title = iframe.locator('h1.text-primary').first();
      await expect(title).toBeVisible();

      const styles = await title.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
        };
      });

      // In dark mode, text color should be light
      expect(styles.color).toBeTruthy();
    });

    test('should render change items in dark mode', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'review-diff', theme: 'dark' }));

      const iframe = page.frameLocator('iframe');
      const changeItem = iframe.locator('li').first();
      await expect(changeItem).toBeVisible();
    });

    test('should load without console errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(createSimulatorUrl({ simulation: 'review-diff', theme: 'dark' }));

      // Wait for iframe content to render
      const iframe = page.frameLocator('iframe');
      await expect(iframe.locator('h1').first()).toBeVisible();

      // Filter out expected iframe/MCP handshake errors
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

  test.describe('Fullscreen Mode', () => {
    test('should not show fullscreen button when already in fullscreen', async ({ page }) => {
      await page.goto(
        createSimulatorUrl({ simulation: 'review-diff', theme: 'light', displayMode: 'fullscreen' })
      );

      const iframe = page.frameLocator('iframe');
      // Wait for content to render first
      await expect(iframe.locator('h1').first()).toBeVisible();

      // The expand button should not be visible in fullscreen mode
      const expandButton = iframe.locator('button[aria-label="Enter fullscreen"]');
      await expect(expandButton).not.toBeVisible();
    });

    test('should render content correctly in fullscreen', async ({ page }) => {
      await page.goto(
        createSimulatorUrl({ simulation: 'review-diff', theme: 'dark', displayMode: 'fullscreen' })
      );

      // The root container should be present
      const root = page.locator('#root');
      await expect(root).not.toBeEmpty();

      // Title should be visible inside the iframe
      const iframe = page.frameLocator('iframe');
      const title = iframe.locator('h1');
      await expect(title).toBeVisible();
    });

    test('should have scrollable content area in fullscreen', async ({ page }) => {
      await page.goto(
        createSimulatorUrl({ simulation: 'review-diff', theme: 'light', displayMode: 'fullscreen' })
      );

      const iframe = page.frameLocator('iframe');
      const contentArea = iframe.locator('.overflow-y-auto').first();
      await expect(contentArea).toBeVisible();

      const styles = await contentArea.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          overflowY: computed.overflowY,
        };
      });

      expect(styles.overflowY).toBe('auto');
    });
  });

  test.describe('Review Post Simulation', () => {
    test('should render post review in light mode', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'review-post', theme: 'light' }));

      await page.waitForLoadState('networkidle');

      // Should render the review content
      const root = page.locator('#root');
      await expect(root).not.toBeEmpty();
    });

    test('should render post review in dark mode', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'review-post', theme: 'dark' }));

      await page.waitForLoadState('networkidle');

      const root = page.locator('#root');
      await expect(root).not.toBeEmpty();
    });
  });

  test.describe('Review Purchase Simulation', () => {
    test('should render purchase review in light mode', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'review-purchase', theme: 'light' }));

      await page.waitForLoadState('networkidle');

      const root = page.locator('#root');
      await expect(root).not.toBeEmpty();
    });

    test('should render purchase review in dark mode', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'review-purchase', theme: 'dark' }));

      await page.waitForLoadState('networkidle');

      const root = page.locator('#root');
      await expect(root).not.toBeEmpty();
    });
  });
});
