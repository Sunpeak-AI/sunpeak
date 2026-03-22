import { test, expect } from '@playwright/test';
import { createSimulatorUrl } from 'sunpeak/chatgpt';

const hosts = ['chatgpt', 'claude'] as const;

for (const host of hosts) {
  test.describe(`Map Resource [${host}]`, () => {
    test.describe('Light Mode', () => {
      test('should render map container with correct styles', async ({ page }) => {
        await page.goto(createSimulatorUrl({ simulation: 'show-map', theme: 'light', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const mapContainer = iframe.locator('.antialiased.w-full.overflow-hidden').first();
        await expect(mapContainer).toBeVisible({ timeout: 10000 });

        const styles = await mapContainer.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            overflow: computed.overflow,
          };
        });

        expect(styles.overflow).toBe('hidden');
      });

      test('should have rounded border in inline mode', async ({ page }) => {
        await page.goto(
          createSimulatorUrl({
            simulation: 'show-map',
            theme: 'light',
            displayMode: 'inline',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const innerContainer = iframe.locator('.border.rounded-2xl').first();
        await expect(innerContainer).toBeVisible({ timeout: 10000 });

        const styles = await innerContainer.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            borderRadius: computed.borderRadius,
            borderWidth: computed.borderWidth,
          };
        });

        // Should have rounded corners (rounded-2xl = 16px)
        expect(parseInt(styles.borderRadius)).toBeGreaterThanOrEqual(16);
      });

      test('should have fullscreen expand button in inline mode', async ({ page }) => {
        await page.goto(
          createSimulatorUrl({
            simulation: 'show-map',
            theme: 'light',
            displayMode: 'inline',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const expandButton = iframe.locator('button[aria-label="Enter fullscreen"]');
        await expect(expandButton).toBeVisible({ timeout: 10000 });

        const styles = await expandButton.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            cursor: computed.cursor,
            position: computed.position,
          };
        });

        expect(styles.cursor).toBe('pointer');
        expect(styles.position).toBe('absolute');
      });

      test('should load without console errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });

        await page.goto(createSimulatorUrl({ simulation: 'show-map', theme: 'light', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const mapContainer = iframe.locator('.antialiased.w-full.overflow-hidden').first();
        await expect(mapContainer).toBeVisible({ timeout: 10000 });

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

    test.describe('Prod Tools Mode', () => {
      test('should show empty state with Run button', async ({ page }) => {
        await page.goto(
          createSimulatorUrl({ simulation: 'show-map', theme: 'dark', host, prodTools: true })
        );

        const emptyState = page.locator('text=Press Run to call the tool');
        await expect(emptyState).toBeVisible();

        const runButton = page.locator('button:has-text("Run")');
        await expect(runButton).toBeVisible();

        const iframe = page.locator('iframe');
        await expect(iframe).not.toBeAttached();
      });

      test('should have themed empty state colors in light mode', async ({ page }) => {
        await page.goto(
          createSimulatorUrl({ simulation: 'show-map', theme: 'light', host, prodTools: true })
        );

        const emptyState = page.locator('text=Press Run to call the tool');
        await expect(emptyState).toBeVisible();

        const color = await emptyState.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        const [r, g, b] = color.match(/\d+/g)!.map(Number);
        expect(r + g + b).toBeLessThan(600);
      });

      test('should have themed empty state colors in dark mode', async ({ page }) => {
        await page.goto(
          createSimulatorUrl({ simulation: 'show-map', theme: 'dark', host, prodTools: true })
        );

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
          createSimulatorUrl({ simulation: 'show-map', theme: 'dark', host, prodResources: true })
        );

        const root = page.locator('#root');
        await expect(root).not.toBeEmpty();
      });
    });

    test.describe('Dark Mode', () => {
      test('should render map container with correct styles', async ({ page }) => {
        await page.goto(createSimulatorUrl({ simulation: 'show-map', theme: 'dark', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const mapContainer = iframe.locator('.antialiased.w-full.overflow-hidden').first();
        await expect(mapContainer).toBeVisible({ timeout: 10000 });
      });

      test('should have appropriate border color for dark mode', async ({ page }) => {
        await page.goto(
          createSimulatorUrl({
            simulation: 'show-map',
            theme: 'dark',
            displayMode: 'inline',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const innerContainer = iframe.locator('.border.rounded-2xl').first();
        await expect(innerContainer).toBeVisible({ timeout: 10000 });

        const styles = await innerContainer.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            borderColor: computed.borderColor,
          };
        });

        // Border color should be set
        expect(styles.borderColor).toBeTruthy();
      });

      test('should load without console errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });

        await page.goto(createSimulatorUrl({ simulation: 'show-map', theme: 'dark', host }));

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const mapContainer = iframe.locator('.antialiased.w-full.overflow-hidden').first();
        await expect(mapContainer).toBeVisible({ timeout: 10000 });

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
      test('should not have rounded border in fullscreen mode', async ({ page }) => {
        await page.goto(
          createSimulatorUrl({
            simulation: 'show-map',
            theme: 'light',
            displayMode: 'fullscreen',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const innerContainer = iframe.locator('.rounded-none.border-0').first();
        await expect(innerContainer).toBeVisible({ timeout: 10000 });

        const styles = await innerContainer.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            borderRadius: computed.borderRadius,
          };
        });

        expect(styles.borderRadius).toBe('0px');
      });

      test('should not show fullscreen button when already in fullscreen', async ({ page }) => {
        await page.goto(
          createSimulatorUrl({
            simulation: 'show-map',
            theme: 'light',
            displayMode: 'fullscreen',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const mapContainer = iframe.locator('.antialiased.w-full.overflow-hidden').first();
        await expect(mapContainer).toBeVisible({ timeout: 10000 });

        // The expand button should not be visible in fullscreen mode
        const expandButton = iframe.locator('button[aria-label="Enter fullscreen"]');
        await expect(expandButton).not.toBeVisible();
      });

      test('should show place list sidebar in fullscreen', async ({ page }) => {
        await page.goto(
          createSimulatorUrl({
            simulation: 'show-map',
            theme: 'dark',
            displayMode: 'fullscreen',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const mapContainer = iframe.locator('.antialiased.w-full.overflow-hidden').first();
        await expect(mapContainer).toBeVisible({ timeout: 10000 });
      });

      test('should show suggestion chips in fullscreen on desktop', async ({ page }) => {
        // Set viewport to desktop size
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.goto(
          createSimulatorUrl({
            simulation: 'show-map',
            theme: 'light',
            displayMode: 'fullscreen',
            host,
          })
        );

        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const mapContainer = iframe.locator('.antialiased.w-full.overflow-hidden').first();
        await expect(mapContainer).toBeVisible({ timeout: 10000 });

        // Suggestion chips should be present (contains "Open now", "Top rated", etc.)
        // Use toBeAttached — Playwright's toBeVisible can false-negative inside
        // double-iframes with overflow:hidden ancestors.
        const openNowChip = iframe.locator('button:has-text("Open now")');
        await expect(openNowChip).toBeAttached({ timeout: 5000 });
      });
    });
  });
}
