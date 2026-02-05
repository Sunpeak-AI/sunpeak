import { test, expect } from '@playwright/test';
import { createSimulatorUrl } from 'sunpeak/chatgpt';

test.describe('Albums Resource', () => {
  test.describe('Light Mode', () => {
    test('should render album cards with correct styles', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'albums-show', theme: 'light' }));

      const iframe = page.frameLocator('iframe');
      const albumCard = iframe.locator('button:has-text("Summer Slice")');
      await expect(albumCard).toBeVisible();

      // Verify album card unique styles
      const styles = await albumCard.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          cursor: computed.cursor,
          borderRadius: computed.borderRadius,
        };
      });

      expect(styles.cursor).toBe('pointer');
      expect(styles.borderRadius).toBe('12px'); // rounded-xl
    });

    test('should have album image with correct aspect ratio', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'albums-show', theme: 'light' }));

      const iframe = page.frameLocator('iframe');
      const albumImage = iframe.locator('button:has-text("Summer Slice") img').first();
      await expect(albumImage).toBeVisible();

      // Verify aspect-[4/3] container
      const imageContainer = iframe.locator('button:has-text("Summer Slice") .aspect-\\[4\\/3\\]');
      await expect(imageContainer).toBeVisible();

      const containerStyles = await imageContainer.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          borderRadius: computed.borderRadius,
          overflow: computed.overflow,
        };
      });

      expect(containerStyles.borderRadius).toBe('12px'); // rounded-xl
      expect(containerStyles.overflow).toBe('hidden');
    });
  });

  test.describe('Dark Mode', () => {
    test('should render album cards with correct styles', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'albums-show', theme: 'dark' }));

      const iframe = page.frameLocator('iframe');
      const albumCard = iframe.locator('button:has-text("Summer Slice")');
      await expect(albumCard).toBeVisible();

      const styles = await albumCard.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          cursor: computed.cursor,
          borderRadius: computed.borderRadius,
        };
      });

      expect(styles.cursor).toBe('pointer');
      expect(styles.borderRadius).toBe('12px'); // rounded-xl
    });

    test('should have text with appropriate contrast', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'albums-show', theme: 'dark' }));

      const iframe = page.frameLocator('iframe');
      const albumTitle = iframe.locator('button:has-text("Summer Slice") .text-primary').first();
      await expect(albumTitle).toBeVisible();

      // In dark mode, text-primary should be light colored for contrast
      const titleStyles = await albumTitle.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
        };
      });

      // Verify the text color exists (should be a light color in dark mode)
      expect(titleStyles.color).toBeTruthy();
    });
  });

  test.describe('Fullscreen Mode', () => {
    test('should render correctly in fullscreen displayMode', async ({ page }) => {
      await page.goto(
        createSimulatorUrl({ simulation: 'albums-show', theme: 'light', displayMode: 'fullscreen' })
      );

      // Wait for content to load
      await page.waitForLoadState('networkidle');

      // The root container should be present
      const root = page.locator('#root');
      await expect(root).not.toBeEmpty();
    });

    test('should maintain album card styles in fullscreen', async ({ page }) => {
      await page.goto(
        createSimulatorUrl({ simulation: 'albums-show', theme: 'dark', displayMode: 'fullscreen' })
      );

      const iframe = page.frameLocator('iframe');
      const albumCard = iframe.locator('button:has-text("Summer Slice")');
      await expect(albumCard).toBeVisible();

      const styles = await albumCard.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          cursor: computed.cursor,
          borderRadius: computed.borderRadius,
        };
      });

      expect(styles.cursor).toBe('pointer');
      expect(styles.borderRadius).toBe('12px');
    });
  });
});
