import { test, expect } from '@playwright/test';
import { createSimulatorUrl } from 'sunpeak/chatgpt';

test.describe('Carousel Resource', () => {
  test.describe('Light Mode', () => {
    test('should render carousel cards with correct styles', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'carousel-show', theme: 'light' }));

      const iframe = page.frameLocator('iframe');
      const card = iframe.locator('.rounded-2xl').first();
      await expect(card).toBeVisible();

      const styles = await card.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          borderRadius: computed.borderRadius,
          cursor: computed.cursor,
        };
      });

      expect(styles.borderRadius).toBe('16px'); // rounded-2xl
      expect(styles.cursor).toBe('pointer');
    });

    test('should have card with border styling', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'carousel-show', theme: 'light' }));

      const iframe = page.frameLocator('iframe');
      const card = iframe.locator('.rounded-2xl.border').first();
      await expect(card).toBeVisible();

      const styles = await card.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          borderWidth: computed.borderWidth,
          borderStyle: computed.borderStyle,
        };
      });

      expect(styles.borderWidth).toBe('1px');
      expect(styles.borderStyle).toBe('solid');
    });

    test('should have interactive buttons', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'carousel-show', theme: 'light' }));

      const iframe = page.frameLocator('iframe');
      const visitButton = iframe.locator('button:has-text("Visit")').first();
      await expect(visitButton).toBeAttached();

      const styles = await visitButton.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          cursor: computed.cursor,
        };
      });

      expect(styles.cursor).toBe('pointer');
    });
  });

  test.describe('Dark Mode', () => {
    test('should render carousel cards with correct styles', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'carousel-show', theme: 'dark' }));

      const iframe = page.frameLocator('iframe');
      const card = iframe.locator('.rounded-2xl').first();
      await expect(card).toBeVisible();

      const styles = await card.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          borderRadius: computed.borderRadius,
          cursor: computed.cursor,
        };
      });

      expect(styles.borderRadius).toBe('16px'); // rounded-2xl
      expect(styles.cursor).toBe('pointer');
    });

    test('should have appropriate background color for dark mode', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'carousel-show', theme: 'dark' }));

      const iframe = page.frameLocator('iframe');
      const card = iframe.locator('.rounded-2xl.bg-surface').first();
      await expect(card).toBeVisible();

      const styles = await card.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
        };
      });

      // Background color should be set (not transparent)
      expect(styles.backgroundColor).toBeTruthy();
      expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    test('should load without console errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(createSimulatorUrl({ simulation: 'carousel-show', theme: 'dark' }));

      // Wait for iframe content to render
      const iframe = page.frameLocator('iframe');
      await expect(iframe.locator('.rounded-2xl').first()).toBeVisible();

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

  // Note: No fullscreen test for carousel as per requirements
});
