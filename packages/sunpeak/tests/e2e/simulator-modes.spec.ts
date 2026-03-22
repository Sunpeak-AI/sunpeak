import { test, expect } from '@playwright/test';
import { createSimulatorUrl } from 'sunpeak/simulator';

/**
 * Package-level e2e tests for simulator mode behavior.
 *
 * These verify core simulator features (Tool Result visibility, prod-tools
 * clearing) across both host shells. They run against the template dev server
 * but test sunpeak package behavior.
 */
const hosts = ['chatgpt', 'claude'] as const;

for (const host of hosts) {
  test.describe(`Tool Result Visibility [${host}]`, () => {
    test('Tool Result section is visible in simulation mode', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'show-albums', theme: 'dark', host }));

      await expect(page.getByTestId('tool-result-section')).toBeVisible();
    });

    test('Tool Result section is visible in prod-tools mode', async ({ page }) => {
      await page.goto(
        createSimulatorUrl({ simulation: 'show-albums', theme: 'dark', host, prodTools: true })
      );

      await expect(page.getByTestId('tool-result-section')).toBeVisible();
    });

    test('Tool Result starts collapsed and empty in prod-tools mode', async ({ page }) => {
      await page.goto(
        createSimulatorUrl({ simulation: 'show-albums', theme: 'dark', host, prodTools: true })
      );

      // Tool Result is collapsed in prod-tools — expand it
      await page.locator('button:has-text("Tool Result (JSON)")').click();

      const toolResultTextarea = page.getByTestId('tool-result-textarea');
      await expect(toolResultTextarea).toBeVisible();
      await expect(toolResultTextarea).toHaveValue('');
    });

    test('Tool Result is expanded and populated in simulation mode', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'show-albums', theme: 'dark', host }));

      const toolResultTextarea = page.getByTestId('tool-result-textarea');
      await expect(toolResultTextarea).toBeVisible();
      const value = await toolResultTextarea.inputValue();
      expect(value).toContain('structuredContent');
    });
  });

  test.describe(`Tool Result Editing [${host}]`, () => {
    test('editing Tool Result updates the rendered resource', async ({ page }) => {
      await page.goto(createSimulatorUrl({ simulation: 'show-albums', theme: 'dark', host }));

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
}
