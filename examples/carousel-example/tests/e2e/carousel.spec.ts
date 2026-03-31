import { test, expect } from '@playwright/test';
import { createInspectorUrl } from './helpers';

const hosts = ['chatgpt', 'claude'] as const;

for (const host of hosts) {
  test.describe(`Carousel Resource [${host}]`, () => {
    test.describe('Light Mode', () => {
      test('should render carousel cards with correct styles', async ({ page }) => {
        await page.goto(createInspectorUrl({ simulation: 'show-carousel', theme: 'light', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
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
        await page.goto(createInspectorUrl({ simulation: 'show-carousel', theme: 'light', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
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
        await page.goto(createInspectorUrl({ simulation: 'show-carousel', theme: 'light', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
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

    test.describe('Prod Tools Mode', () => {
      test('should show empty state with Run button', async ({ page }) => {
        await page.goto(createInspectorUrl({ tool: 'show-carousel', theme: 'dark', host }));

        const emptyState = page.locator('text=Press Run to call the tool');
        await expect(emptyState).toBeVisible();

        const runButton = page.locator('button:has-text("Run")');
        await expect(runButton).toBeVisible();

        const iframe = page.locator('iframe');
        await expect(iframe).not.toBeAttached();
      });

      test('should have themed empty state colors in light mode', async ({ page }) => {
        await page.goto(createInspectorUrl({ tool: 'show-carousel', theme: 'light', host }));

        const emptyState = page.locator('text=Press Run to call the tool');
        await expect(emptyState).toBeVisible();

        const color = await emptyState.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        const [r, g, b] = color.match(/\d+/g)!.map(Number);
        expect(r + g + b).toBeLessThan(600);
      });

      test('should have themed empty state colors in dark mode', async ({ page }) => {
        await page.goto(createInspectorUrl({ tool: 'show-carousel', theme: 'dark', host }));

        const emptyState = page.locator('text=Press Run to call the tool');
        await expect(emptyState).toBeVisible();

        const color = await emptyState.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        const [r, g, b] = color.match(/\d+/g)!.map(Number);
        expect(r + g + b).toBeGreaterThan(200);
      });
    });

    test.describe('Prod Resources Mode', () => {
      test('should activate without errors', async ({ page }) => {
        await page.goto(
          createInspectorUrl({
            simulation: 'show-carousel',
            theme: 'dark',
            host,
            prodResources: true,
          })
        );

        const root = page.locator('#root');
        await expect(root).not.toBeEmpty();
      });
    });

    test.describe('Fullscreen Mode', () => {
      test('should render correctly in fullscreen displayMode', async ({ page }) => {
        await page.goto(
          createInspectorUrl({
            simulation: 'show-carousel',
            theme: 'light',
            displayMode: 'fullscreen',
            host,
          })
        );

        await page.waitForLoadState('networkidle');
        const root = page.locator('#root');
        await expect(root).not.toBeEmpty();
      });

      test('should show detail view with place info in fullscreen', async ({ page }) => {
        await page.goto(
          createInspectorUrl({
            simulation: 'show-carousel',
            theme: 'light',
            displayMode: 'fullscreen',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');

        // Click the first card to open fullscreen detail
        const card = iframe.locator('.rounded-2xl').first();
        await expect(card).toBeVisible();
        await card.click();

        // Should show detail view with place name, description, and detail fields
        await expect(iframe.locator('h1:has-text("Lady Bird Lake")')).toBeVisible({
          timeout: 5000,
        });
        await expect(iframe.locator('text=Highlights')).toBeVisible();
        await expect(iframe.locator('text=Tips')).toBeVisible();
      });

      test('should show detail view when Learn More is clicked', async ({ page }) => {
        await page.goto(
          createInspectorUrl({
            simulation: 'show-carousel',
            theme: 'light',
            displayMode: 'fullscreen',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');

        // Click "Learn More" on the first card
        const learnMore = iframe.locator('button:has-text("Learn More")').first();
        await expect(learnMore).toBeVisible();
        await learnMore.click();

        // Should show detail view
        await expect(iframe.locator('h1:has-text("Lady Bird Lake")')).toBeVisible({
          timeout: 5000,
        });
        await expect(iframe.locator('text=Address')).toBeVisible();
      });

      test('should not have a back button in detail view', async ({ page }) => {
        await page.goto(
          createInspectorUrl({
            simulation: 'show-carousel',
            theme: 'light',
            displayMode: 'fullscreen',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');

        // Click the first card to open detail
        const card = iframe.locator('.rounded-2xl').first();
        await expect(card).toBeVisible();
        await card.click();

        await expect(iframe.locator('h1:has-text("Lady Bird Lake")')).toBeVisible({
          timeout: 5000,
        });

        // Back button should not exist
        const backButton = iframe.locator('button[aria-label="Back to carousel"]');
        await expect(backButton).not.toBeAttached();
      });

      test('should center the hero image without stretching', async ({ page }) => {
        await page.goto(
          createInspectorUrl({
            simulation: 'show-carousel',
            theme: 'light',
            displayMode: 'fullscreen',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');

        // Click the first card to open detail
        const card = iframe.locator('.rounded-2xl').first();
        await expect(card).toBeVisible();
        await card.click();

        await expect(iframe.locator('h1:has-text("Lady Bird Lake")')).toBeVisible({
          timeout: 5000,
        });

        // Check the image container is centered
        const imageContainer = iframe.locator('img').first().locator('..');
        const styles = await imageContainer.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            justifyContent: computed.justifyContent,
          };
        });

        expect(styles.justifyContent).toBe('center');
      });
    });

    test.describe('Dark Mode', () => {
      test('should render carousel cards with correct styles', async ({ page }) => {
        await page.goto(createInspectorUrl({ simulation: 'show-carousel', theme: 'dark', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
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

      test('should have appropriate styling for dark mode', async ({ page }) => {
        await page.goto(createInspectorUrl({ simulation: 'show-carousel', theme: 'dark', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        // Select card by its border + rounded combo
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

      test('should load without console errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });

        await page.goto(createInspectorUrl({ simulation: 'show-carousel', theme: 'dark', host }));

        // Wait for iframe content to render
        const iframe = page.frameLocator('iframe').frameLocator('iframe');
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
  });
}
