import { test, expect } from '@playwright/test';
import { createInspectorUrl } from 'sunpeak/chatgpt';

const hosts = ['chatgpt', 'claude'] as const;

for (const host of hosts) {
  test.describe(`Dev Overlay [${host}]`, () => {
    test('shows resource timestamp in dev overlay on initial load', async ({ page }) => {
      await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host }));

      const iframe = page.frameLocator('iframe').frameLocator('iframe');

      // The dev overlay button should be present with the resource timestamp
      const overlay = iframe.locator('#__sunpeak-dev-timing');
      await expect(overlay).toBeAttached();

      // Should contain the "Resource:" label with an HH:MM:SS timestamp
      const text = await overlay.textContent();
      expect(text).toMatch(/Resource:\s*\d{2}:\d{2}:\d{2}/);

      // Should NOT contain "Tool:" row before any tool call via Run
      expect(text).not.toContain('Tool:');
    });

    test('shows tool timing after Run is clicked', async ({ page }) => {
      await page.goto(createInspectorUrl({ tool: 'show-albums', theme: 'dark', host }));

      // Click Run to trigger a real tool call
      const runButton = page.locator('button:has-text("Run")');
      await expect(runButton).toBeVisible();
      await runButton.click();

      // Wait for the resource iframe to appear (Run loads the resource)
      const iframe = page.frameLocator('iframe').frameLocator('iframe');

      const overlay = iframe.locator('#__sunpeak-dev-timing');
      await expect(overlay).toBeAttached();

      // After Run, the overlay should show both Resource and Tool rows.
      // Assert timing is a number followed by "ms" — don't assert the specific value.
      await expect(overlay).toContainText(/Tool:\s*\d+(\.\d)?ms/, { timeout: 10_000 });
      await expect(overlay).toContainText(/Resource:/);
    });

    test('dev overlay collapses and expands on click', async ({ page }) => {
      await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host }));

      const iframe = page.frameLocator('iframe').frameLocator('iframe');
      const overlay = iframe.locator('#__sunpeak-dev-timing');
      await expect(overlay).toBeAttached();

      // Initially expanded — shows "Resource:" label
      await expect(overlay).toContainText('Resource:');

      // Click to collapse
      await overlay.evaluate((el) => (el as HTMLElement).click());
      await expect(overlay).toContainText('DEV');
      // Collapsed state should NOT show the timestamp
      const collapsedText = await overlay.textContent();
      expect(collapsedText).not.toMatch(/\d{2}:\d{2}:\d{2}/);

      // Click again to expand
      await overlay.evaluate((el) => (el as HTMLElement).click());
      await expect(overlay).toContainText('Resource:');
    });

    test('dev overlay is still present in prod resources served from dev server', async ({
      page,
    }) => {
      await page.goto(
        createInspectorUrl({
          simulation: 'show-albums',
          theme: 'dark',
          host,
          prodResources: true,
        })
      );

      // Wait for content to load
      await page.waitForLoadState('networkidle');

      // If the iframe is present, check that the dev overlay is NOT there.
      // In prod resources mode served from the dev server, the overlay IS
      // injected (dev server always adds it for debugging). So we verify
      // it's at least attached if the iframe loaded.
      const iframeCount = await page.locator('iframe').count();
      if (iframeCount > 0) {
        const iframe = page.frameLocator('iframe').frameLocator('iframe');
        const overlay = iframe.locator('#__sunpeak-dev-timing');
        // The dev server injects the overlay even into prod resources for debugging.
        // This is by design — only a true production deployment omits it.
        await expect(overlay).toBeAttached({ timeout: 5_000 });
      }
    });

    test('dev overlay has correct visual styling', async ({ page }) => {
      await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host }));

      const iframe = page.frameLocator('iframe').frameLocator('iframe');
      const overlay = iframe.locator('#__sunpeak-dev-timing');
      await expect(overlay).toBeAttached();

      const styles = await overlay.evaluate((el) => {
        const s = window.getComputedStyle(el);
        return {
          position: s.position,
          zIndex: s.zIndex,
          fontFamily: s.fontFamily,
        };
      });

      expect(styles.position).toBe('fixed');
      expect(Number(styles.zIndex)).toBe(2147483647);
      // Monospace font family
      expect(styles.fontFamily).toMatch(/monospace/i);
    });
  });
}
