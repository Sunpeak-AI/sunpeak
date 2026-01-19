import { test, expect } from '@playwright/test';
import { createSimulatorUrl } from 'sunpeak/chatgpt';

test.describe('Carousel Resource', () => {
  test.describe('Light Mode', () => {
    test('should render carousel cards with correct styles', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'carousel-show', theme: 'light' }));

      // Wait for carousel to load
      await page.waitForLoadState('networkidle');

      // Find a card in the carousel
      const card = page.locator('.rounded-2xl').first();
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

      await page.waitForLoadState('networkidle');

      // Cards have border-subtle styling
      const card = page.locator('.rounded-2xl.border').first();
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

      await page.waitForLoadState('networkidle');

      // Find the Visit button (primary button)
      const visitButton = page.locator('button:has-text("Visit")').first();
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

      await page.waitForLoadState('networkidle');

      const card = page.locator('.rounded-2xl').first();
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

      await page.waitForLoadState('networkidle');

      // Verify the card has a background color set
      const card = page.locator('.rounded-2xl.bg-surface').first();
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
      await page.waitForLoadState('networkidle');

      expect(errors).toHaveLength(0);
    });
  });

  // Note: No fullscreen test for carousel as per requirements
});
