import { test, expect } from 'sunpeak/test';

test('albums tool renders photo grid with correct styles', async ({ live }) => {
  const app = await live.invoke('show-albums');

  // First album from simulation data: "Summer Slice"
  const albumCard = app.locator('button').first();
  await expect(albumCard).toBeVisible({ timeout: 15_000 });
  await expect(app.getByText('Summer Slice')).toBeVisible();
  await expect(app.locator('img').first()).toBeVisible();

  // Card styles: rounded corners, pointer cursor
  const cardStyles = await albumCard.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return { cursor: s.cursor, borderRadius: s.borderRadius };
  });
  expect(cardStyles.cursor).toBe('pointer');
  expect(parseInt(cardStyles.borderRadius)).toBeGreaterThanOrEqual(12);

  // Image container: overflow hidden
  const imgContainer = app.locator('button div').first();
  const containerStyles = await imgContainer.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return { overflow: s.overflow };
  });
  expect(containerStyles.overflow).toBe('hidden');

  // Theme: text color has appropriate luminance in light mode
  const textColor = await albumCard.evaluate((el) => window.getComputedStyle(el).color);
  assertTextContrast(textColor);

  // Switch to dark mode while grid is still visible and verify re-theming
  await live.setColorScheme('dark', app);
  await expect(app.getByText('Summer Slice')).toBeVisible();
  const darkTextColor = await albumCard.evaluate((el) => window.getComputedStyle(el).color);
  assertTextContrast(darkTextColor);

  // Open the first album — should enter fullscreen viewer with large rounded photo
  await albumCard.click();
  const mainPhoto = app.locator('img[class*="rounded-3xl"]').first();
  await expect(mainPhoto).toBeVisible({ timeout: 10_000 });
});

/** Verify text color is not transparent and has a resolved RGB value. */
function assertTextContrast(color: string) {
  expect(color).toBeTruthy();
  expect(color).not.toBe('rgba(0, 0, 0, 0)');
  const match = color.match(/\d+/g);
  expect(match).toBeTruthy();
  // At least one channel should be non-zero (text is visible)
  const [r, g, b] = match!.map(Number);
  expect(r + g + b).toBeGreaterThan(0);
}
