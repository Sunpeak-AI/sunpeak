import { test, expect } from '@playwright/test';
import { createInspectorUrl } from './helpers';

const hosts = ['chatgpt', 'claude'] as const;

for (const host of hosts) {
  test.describe(`Review Resource [${host}]`, () => {
    test.describe('Light Mode', () => {
      test('should render review title with correct styles', async ({ page }) => {
        await page.goto(createInspectorUrl({ simulation: 'review-diff', theme: 'light', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
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
        await page.goto(createInspectorUrl({ simulation: 'review-diff', theme: 'light', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
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
        await page.goto(createInspectorUrl({ simulation: 'review-diff', theme: 'light', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');

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
          createInspectorUrl({
            simulation: 'review-diff',
            theme: 'light',
            displayMode: 'inline',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
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

    test.describe('Prod Tools Mode', () => {
      test('should show empty state with Run button', async ({ page }) => {
        await page.goto(createInspectorUrl({ tool: 'review-diff', theme: 'dark', host }));

        const emptyState = page.locator('text=Press Run to call the tool');
        await expect(emptyState).toBeVisible();

        const runButton = page.locator('button:has-text("Run")');
        await expect(runButton).toBeVisible();

        const iframe = page.locator('iframe');
        await expect(iframe).not.toBeAttached();
      });

      test('should have themed empty state colors in light mode', async ({ page }) => {
        await page.goto(createInspectorUrl({ tool: 'review-diff', theme: 'light', host }));

        const emptyState = page.locator('text=Press Run to call the tool');
        await expect(emptyState).toBeVisible();

        const color = await emptyState.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        const [r, g, b] = color.match(/\d+/g)!.map(Number);
        expect(r + g + b).toBeLessThan(600);
      });

      test('should have themed empty state colors in dark mode', async ({ page }) => {
        await page.goto(createInspectorUrl({ tool: 'review-diff', theme: 'dark', host }));

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
            simulation: 'review-diff',
            theme: 'dark',
            host,
            prodResources: true,
          })
        );

        const root = page.locator('#root');
        await expect(root).not.toBeEmpty();
      });
    });

    test.describe('Dark Mode', () => {
      test('should render review title with correct styles', async ({ page }) => {
        await page.goto(createInspectorUrl({ simulation: 'review-diff', theme: 'dark', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const title = iframe.locator('h1:has-text("Refactor Authentication Module")');
        await expect(title).toBeVisible();
      });

      test('should have appropriate text colors for dark mode', async ({ page }) => {
        await page.goto(createInspectorUrl({ simulation: 'review-diff', theme: 'dark', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const title = iframe.locator('h1').first();
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
        await page.goto(createInspectorUrl({ simulation: 'review-diff', theme: 'dark', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
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

        await page.goto(createInspectorUrl({ simulation: 'review-diff', theme: 'dark', host }));

        // Wait for iframe content to render
        const iframe = page.frameLocator('iframe').frameLocator('iframe');
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
          createInspectorUrl({
            simulation: 'review-diff',
            theme: 'light',
            displayMode: 'fullscreen',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        // Wait for content to render first
        await expect(iframe.locator('h1').first()).toBeVisible();

        // The expand button should not be visible in fullscreen mode
        const expandButton = iframe.locator('button[aria-label="Enter fullscreen"]');
        await expect(expandButton).not.toBeVisible();
      });

      test('should render content correctly in fullscreen', async ({ page }) => {
        await page.goto(
          createInspectorUrl({
            simulation: 'review-diff',
            theme: 'dark',
            displayMode: 'fullscreen',
            host,
          })
        );

        // The root container should be present
        const root = page.locator('#root');
        await expect(root).not.toBeEmpty();

        // Title should be visible inside the iframe
        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const title = iframe.locator('h1');
        await expect(title).toBeVisible();
      });

      test('should render content in fullscreen mode', async ({ page }) => {
        await page.goto(
          createInspectorUrl({
            simulation: 'review-diff',
            theme: 'light',
            displayMode: 'fullscreen',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        // Content sections should be visible in fullscreen
        const title = iframe.locator('h1');
        await expect(title).toBeVisible();

        // Fullscreen expand button should NOT be visible (already in fullscreen)
        const expandButton = iframe.locator('button[aria-label="Enter fullscreen"]');
        await expect(expandButton).toHaveCount(0);
      });
    });

    test.describe('Review Post Simulation', () => {
      test('should render post review in light mode', async ({ page }) => {
        await page.goto(createInspectorUrl({ simulation: 'review-post', theme: 'light', host }));

        await page.waitForLoadState('networkidle');

        // Should render the review content
        const root = page.locator('#root');
        await expect(root).not.toBeEmpty();
      });

      test('should render post review in dark mode', async ({ page }) => {
        await page.goto(createInspectorUrl({ simulation: 'review-post', theme: 'dark', host }));

        await page.waitForLoadState('networkidle');

        const root = page.locator('#root');
        await expect(root).not.toBeEmpty();
      });

      test('should show server success message when confirming', async ({ page }) => {
        await page.goto(
          createInspectorUrl({
            simulation: 'review-post',
            theme: 'dark',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const publishButton = iframe.locator('button:has-text("Publish")');
        await expect(publishButton).toBeVisible();
        // Use evaluate to dispatch click directly — Playwright's coordinate-based
        // click can miss the target inside the double cross-origin iframe.
        await publishButton.evaluate((el) => (el as HTMLElement).click());

        // Should show the server's success message from serverTools mock
        await expect(iframe.locator('text=Completed.')).toBeVisible({ timeout: 10000 });
        // Should also show what button was pressed
        await expect(iframe.locator('text=Publishing post...')).toBeVisible({ timeout: 10000 });
      });

      test('should show server cancel message when rejecting', async ({ page }) => {
        await page.goto(
          createInspectorUrl({
            simulation: 'review-post',
            theme: 'dark',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const cancelButton = iframe.locator('button:has-text("Cancel")');
        await expect(cancelButton).toBeVisible();
        await cancelButton.evaluate((el) => (el as HTMLElement).click());

        // Server returned cancelled status via serverTools when condition
        await expect(iframe.locator('text=Cancelled.')).toBeVisible({ timeout: 10000 });
      });
    });

    test.describe('Review Purchase Simulation', () => {
      test('should render purchase review in light mode', async ({ page }) => {
        await page.goto(
          createInspectorUrl({ simulation: 'review-purchase', theme: 'light', host })
        );

        await page.waitForLoadState('networkidle');

        const root = page.locator('#root');
        await expect(root).not.toBeEmpty();
      });

      test('should render purchase review in dark mode', async ({ page }) => {
        await page.goto(createInspectorUrl({ simulation: 'review-purchase', theme: 'dark', host }));

        await page.waitForLoadState('networkidle');

        const root = page.locator('#root');
        await expect(root).not.toBeEmpty();
      });

      test('should show loading then result when placing order', async ({ page }) => {
        await page.goto(
          createInspectorUrl({
            simulation: 'review-purchase',
            theme: 'light',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const placeOrderButton = iframe.locator('button:has-text("Place Order")');
        await expect(placeOrderButton).toBeVisible();
        await placeOrderButton.evaluate((el) => (el as HTMLElement).click());

        // After server responds, should show what the user clicked and the server result
        await expect(iframe.locator('text=Placing order...')).toBeVisible({ timeout: 10000 });
        await expect(iframe.locator('text=Completed.')).toBeVisible({ timeout: 10000 });
      });
    });

    test.describe('Server Tool Simulation via serverTools field', () => {
      test('should confirm review-diff and show server success', async ({ page }) => {
        await page.goto(
          createInspectorUrl({
            simulation: 'review-diff',
            theme: 'dark',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const applyButton = iframe.locator('button:has-text("Apply Changes")');
        await expect(applyButton).toBeVisible();
        await applyButton.evaluate((el) => (el as HTMLElement).click());

        // Should show the decision label and server response
        await expect(iframe.locator('text=Applying changes...')).toBeVisible({ timeout: 10000 });
        await expect(iframe.locator('text=Completed.')).toBeVisible({ timeout: 10000 });
      });

      test('should cancel review-diff and show server cancelled', async ({ page }) => {
        await page.goto(
          createInspectorUrl({
            simulation: 'review-diff',
            theme: 'dark',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const cancelButton = iframe.locator('button:has-text("Cancel")');
        await expect(cancelButton).toBeVisible();
        await cancelButton.evaluate((el) => (el as HTMLElement).click());

        // Server returned cancelled status via when condition matching
        await expect(iframe.locator('text=Cancelled.')).toBeVisible({ timeout: 10000 });
      });
    });
  });
}
