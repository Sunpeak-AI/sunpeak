import { test, expect } from '@playwright/test';
import { createInspectorUrl } from 'sunpeak/inspector';

/**
 * Package-level e2e tests for inspector mode behavior.
 *
 * These verify core inspector features (Tool Result visibility, prod-tools
 * clearing, prod-resources, host switching, display modes, simulation switching)
 * across both host shells. They run against the template dev server but test
 * sunpeak package behavior.
 */
const hosts = ['chatgpt', 'claude'] as const;

for (const host of hosts) {
  test.describe(`Tool Result Visibility [${host}]`, () => {
    test('Tool Result section is visible in simulation mode', async ({ page }) => {
      await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host }));

      await expect(page.getByTestId('tool-result-section')).toBeVisible();
    });

    test('Tool Result section is visible when no simulation selected', async ({ page }) => {
      await page.goto(createInspectorUrl({ tool: 'show-albums', theme: 'dark', host }));

      await expect(page.getByTestId('tool-result-section')).toBeVisible();
    });

    test('Tool Result is empty when no simulation selected', async ({ page }) => {
      await page.goto(createInspectorUrl({ tool: 'show-albums', theme: 'dark', host }));

      const toolResultTextarea = page.getByTestId('tool-result-textarea');
      await expect(toolResultTextarea).toBeVisible();
      await expect(toolResultTextarea).toHaveValue('');
    });

    test('Tool Result is expanded and populated in simulation mode', async ({ page }) => {
      await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host }));

      const toolResultTextarea = page.getByTestId('tool-result-textarea');
      await expect(toolResultTextarea).toBeVisible();
      const value = await toolResultTextarea.inputValue();
      expect(value).toContain('structuredContent');
    });
  });

  test.describe(`Tool Result Editing [${host}]`, () => {
    test('editing Tool Result updates the rendered resource', async ({ page }) => {
      await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host }));

      const iframe = page.frameLocator('iframe').frameLocator('iframe');

      // Verify original content renders
      await expect(iframe.locator('button:has-text("Summer Slice")')).toBeVisible();

      // Edit the Tool Result to change an album title
      const toolResultTextarea = page.getByTestId('tool-result-textarea');
      await expect(toolResultTextarea).toBeVisible();

      // Get current value and replace album title
      const currentValue = await toolResultTextarea.inputValue();
      const modifiedValue = currentValue.replace('Summer Slice', 'Modified Album');

      // Clear and type new value, then blur to commit
      await toolResultTextarea.click();
      await toolResultTextarea.fill(modifiedValue);
      // Blur triggers commitJSON which updates the simulation state
      await toolResultTextarea.blur();

      // The resource should re-render with the new title
      await expect(iframe.locator('button:has-text("Modified Album")')).toBeVisible({
        timeout: 5000,
      });
      // Original title should be gone
      await expect(iframe.locator('button:has-text("Summer Slice")')).not.toBeVisible();
    });
  });

  test.describe(`Run with Real Handlers [${host}]`, () => {
    test('Run button calls real handler and renders real output', async ({ page }) => {
      await page.goto(createInspectorUrl({ tool: 'show-albums', theme: 'dark', host }));

      const iframe = page.frameLocator('iframe').frameLocator('iframe');

      // With tool-only (no simulation), should show "Press Run" placeholder
      await expect(page.locator('text=Press Run to call the tool')).toBeVisible();

      // Click the Run button
      await page.locator('button:has-text("Run")').click();

      // The real handler returns "Food Photos" (from toolInput.category: "food")
      // The simulation mock has "Summer Slice" — we should NOT see that.
      await expect(iframe.locator('button:has-text("Food Photos")')).toBeVisible({
        timeout: 10000,
      });

      // Tool Result textarea should be populated with the real handler's response
      const toolResultTextarea = page.getByTestId('tool-result-textarea');
      await expect(toolResultTextarea).toBeVisible();
      const value = await toolResultTextarea.inputValue();
      expect(value).toContain('Food Photos');
      // Should NOT contain simulation mock data
      expect(value).not.toContain('Summer Slice');
    });
  });

  test.describe(`Prod Resources [${host}]`, () => {
    test('resource renders from dist/ build', async ({ page }) => {
      await page.goto(
        createInspectorUrl({
          simulation: 'show-albums',
          theme: 'dark',
          host,
          prodResources: true,
        })
      );

      const iframe = page.frameLocator('iframe').frameLocator('iframe');

      // Wait for the build to complete and the resource to render.
      // May briefly show "Building..." before the dist file is ready.
      await expect(iframe.locator('button:has-text("Summer Slice")')).toBeVisible({
        timeout: 30000,
      });
    });
  });

  test.describe(`Simulation Switching [${host}]`, () => {
    test('switching tool changes the rendered resource', async ({ page }) => {
      // Start with albums
      await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host }));

      const iframe = page.frameLocator('iframe').frameLocator('iframe');
      await expect(iframe.locator('button:has-text("Summer Slice")')).toBeVisible();

      // Switch to carousel tool via the Tool dropdown
      const toolSelect = page.getByTestId('tool-selector').locator('select');
      const options = await toolSelect.locator('option').allTextContents();
      const carouselOption = options.find((o) => o.toLowerCase().includes('carousel'));
      if (!carouselOption) throw new Error(`No carousel option found in: ${options.join(', ')}`);
      await toolSelect.selectOption({ label: carouselOption });

      // The carousel resource should render (different content from albums)
      // Wait for new content — carousel has image slides
      await expect(iframe.locator('img').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe(`Display Modes [${host}]`, () => {
    test('switching to fullscreen changes display mode', async ({ page }) => {
      await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host }));

      const iframe = page.frameLocator('iframe').frameLocator('iframe');
      // Wait for resource to render
      await expect(iframe.locator('button:has-text("Summer Slice")')).toBeVisible();

      // Click "Full" button in Display Mode toggle
      await page.locator('button[aria-pressed]:has-text("Full")').click();

      // The resource should still be visible after mode change
      await expect(iframe.locator('button:has-text("Summer Slice")')).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe(`Theme Switching [${host}]`, () => {
    test('switching theme to light updates the document', async ({ page }) => {
      await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host }));

      // Click "Light" button in Theme toggle
      await page.locator('button[aria-pressed]:has-text("Light")').click();

      // The color-scheme should change to light
      const colorScheme = await page.evaluate(() => document.documentElement.style.colorScheme);
      expect(colorScheme).toContain('light');
    });
  });
}

test.describe('Host Switching', () => {
  test('switching from ChatGPT to Claude changes conversation chrome', async ({ page }) => {
    await page.goto(
      createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host: 'chatgpt' })
    );

    const iframe = page.frameLocator('iframe').frameLocator('iframe');
    await expect(iframe.locator('button:has-text("Summer Slice")')).toBeVisible();

    // Switch host to Claude
    const hostSelect = page.locator('select').filter({ hasText: /ChatGPT|Claude/i });
    await hostSelect.selectOption('claude');

    // Resource should still render after host switch
    await expect(iframe.locator('button:has-text("Summer Slice")')).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe('Resource Rendering', () => {
  test('resource renders inside double-iframe sandbox', async ({ page }) => {
    await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark' }));

    // Verify double-iframe structure: outer iframe (sandbox proxy) → inner iframe (app)
    const outerIframe = page.frameLocator('iframe');
    const innerIframe = outerIframe.frameLocator('iframe');

    // Content should be in the inner iframe
    await expect(innerIframe.locator('#root')).toBeAttached();
    await expect(innerIframe.locator('button:has-text("Summer Slice")')).toBeVisible();
  });
});
