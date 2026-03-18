import { test, expect } from 'sunpeak/test';

test('carousel tool renders cards with correct styles', async ({ live }) => {
  const app = await live.invoke('show-carousel');

  // First place from simulation data: "Lady Bird Lake"
  await expect(app.locator('img').first()).toBeVisible({ timeout: 15_000 });
  await expect(app.getByText('Lady Bird Lake')).toBeVisible();
  const buttons = app.locator('button');
  expect(await buttons.count()).toBeGreaterThanOrEqual(1);

  // Card styles: rounded corners, border, pointer cursor
  const card = app.locator('div[class*="rounded"]').first();
  await expect(card).toBeVisible();

  // Click the Visit button on the first card — handler should run without crashing
  const visitButton = app.getByRole('button', { name: /visit/i }).first();
  await visitButton.click();
  await expect(card).toBeVisible();

  const cardStyles = await card.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return {
      borderRadius: s.borderRadius,
      borderStyle: s.borderStyle,
      borderWidth: s.borderWidth,
    };
  });
  expect(parseInt(cardStyles.borderRadius)).toBeGreaterThanOrEqual(16);
  expect(cardStyles.borderStyle).toBe('solid');
  expect(cardStyles.borderWidth).toBe('1px');

  // Theme: border color is visible (not transparent)
  const borderColor = await card.evaluate((el) => window.getComputedStyle(el).borderColor);
  expect(borderColor).not.toBe('rgba(0, 0, 0, 0)');

  // Text is rendered and visible
  const textContent = await app
    .locator('div')
    .first()
    .evaluate((el) => el.textContent);
  expect(textContent!.length).toBeGreaterThan(0);

  // Switch to dark mode and verify the app re-themes correctly
  await live.setColorScheme('dark', app);
  await expect(app.getByText('Lady Bird Lake')).toBeVisible();
  const darkBorderColor = await app
    .locator('div[class*="rounded"]')
    .first()
    .evaluate((el) => window.getComputedStyle(el).borderColor);
  expect(darkBorderColor).not.toBe('rgba(0, 0, 0, 0)');
});
