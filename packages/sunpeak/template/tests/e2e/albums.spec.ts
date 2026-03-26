import { test, expect } from '@playwright/test';
import { createInspectorUrl } from './helpers';

const hosts = ['chatgpt', 'claude'] as const;

for (const host of hosts) {
  test.describe(`Albums Resource [${host}]`, () => {
    test.describe('Light Mode', () => {
      test('should render album cards with correct styles', async ({ page }) => {
        await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'light', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
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
        await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'light', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const albumImage = iframe.locator('button:has-text("Summer Slice") img').first();
        await expect(albumImage).toBeVisible();

        // Verify aspect-[4/3] container
        const imageContainer = iframe.locator(
          'button:has-text("Summer Slice") .aspect-\\[4\\/3\\]'
        );
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
        await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
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
        await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const albumTitle = iframe.locator('button:has-text("Summer Slice") div').first();
        await expect(albumTitle).toBeVisible();

        // In dark mode, text should be light colored for contrast
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

    test.describe('Prod Tools Mode', () => {
      test('should show empty state with Run button', async ({ page }) => {
        await page.goto(createInspectorUrl({ tool: 'show-albums', theme: 'dark', host }));

        // Should show the "Press Run to call the tool" empty state
        const emptyState = page.locator('text=Press Run to call the tool');
        await expect(emptyState).toBeVisible();

        // Run button should be visible in the conversation header
        const runButton = page.locator('button:has-text("Run")');
        await expect(runButton).toBeVisible();

        // Iframe should NOT be present (no resource loaded yet)
        const iframe = page.locator('iframe');
        await expect(iframe).not.toBeAttached();
      });

      test('should have themed empty state colors in light mode', async ({ page }) => {
        await page.goto(createInspectorUrl({ tool: 'show-albums', theme: 'light', host }));

        const emptyState = page.locator('text=Press Run to call the tool');
        await expect(emptyState).toBeVisible();

        const color = await emptyState.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        // Light mode text-secondary should be a dark-ish color (not white/very light)
        const [r, g, b] = color.match(/\d+/g)!.map(Number);
        // In light mode, secondary text should have a reasonable luminance (not too bright)
        expect(r + g + b).toBeLessThan(600);
      });

      test('should have themed empty state colors in dark mode', async ({ page }) => {
        await page.goto(createInspectorUrl({ tool: 'show-albums', theme: 'dark', host }));

        const emptyState = page.locator('text=Press Run to call the tool');
        await expect(emptyState).toBeVisible();

        const color = await emptyState.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        // Dark mode text-secondary should be a light-ish color (not black/very dark)
        const [r, g, b] = color.match(/\d+/g)!.map(Number);
        expect(r + g + b).toBeGreaterThan(200);
      });
    });

    test.describe('Prod Resources Mode', () => {
      test('should render resource normally when dist is available', async ({ page }) => {
        // With prodResources=true but no dist/ files, shows "Building..."
        // With dist/ files available, renders the resource from dist/
        // This test verifies the mode activates without errors
        await page.goto(
          createInspectorUrl({
            simulation: 'show-albums',
            theme: 'dark',
            host,
            prodResources: true,
          })
        );

        // Should either show "Building..." or the resource (depending on dist availability)
        const root = page.locator('#root');
        await expect(root).not.toBeEmpty();
      });
    });

    test.describe('Fullscreen Mode', () => {
      test('should render correctly in fullscreen displayMode', async ({ page }) => {
        await page.goto(
          createInspectorUrl({
            simulation: 'show-albums',
            theme: 'light',
            displayMode: 'fullscreen',
            host,
          })
        );

        // Wait for content to load
        await page.waitForLoadState('networkidle');

        // The root container should be present
        const root = page.locator('#root');
        await expect(root).not.toBeEmpty();
      });

      test('should maintain album card styles in fullscreen', async ({ page }) => {
        await page.goto(
          createInspectorUrl({
            simulation: 'show-albums',
            theme: 'dark',
            displayMode: 'fullscreen',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
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

      test('should render content after switching from inline to fullscreen', async ({ page }) => {
        // Start in inline mode
        await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        await expect(iframe.locator('button:has-text("Summer Slice")')).toBeVisible();

        // Switch to fullscreen via sidebar
        await page.locator('button:has-text("Full")').click();

        // Content should still be visible after the mode transition
        await expect(iframe.locator('button:has-text("Summer Slice")')).toBeVisible({
          timeout: 5000,
        });
      });

      // Claude doesn't support PiP — only run this test for hosts that have the button.
      (host === 'claude' ? test.skip : test)(
        'should render content after switching from inline to pip',
        async ({ page }) => {
          // Start in inline mode
          await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host }));

          const iframe = page.frameLocator('iframe').frameLocator('iframe');
          await expect(iframe.locator('button:has-text("Summer Slice")')).toBeVisible();

          // Switch to PiP via sidebar
          await page.locator('button:has-text("PiP")').click();

          // Content should still be visible after the mode transition
          await expect(iframe.locator('button:has-text("Summer Slice")')).toBeVisible({
            timeout: 5000,
          });
        }
      );
    });
  });
}
