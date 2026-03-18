import { test, expect } from 'sunpeak/test';

test('map tool renders interactive map with correct styles', async ({ live }) => {
  const app = await live.invoke('show-map');

  // Map canvas renders (mapbox-gl)
  const canvas = app.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 15_000 });

  // Canvas has non-zero dimensions (map actually rendered, not just an empty element)
  const dimensions = await canvas.evaluate((el) => ({
    width: el.clientWidth,
    height: el.clientHeight,
  }));
  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.height).toBeGreaterThan(0);

  // Map container: overflow hidden
  const container = app.locator('div[class*="overflow-hidden"]').first();
  await expect(container).toBeVisible();

  const containerStyles = await container.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return { overflow: s.overflow };
  });
  expect(containerStyles.overflow).toBe('hidden');

  // Switch to dark mode and verify the map re-renders
  await live.setColorScheme('dark', app);
  await expect(app.locator('canvas').first()).toBeVisible();
});
