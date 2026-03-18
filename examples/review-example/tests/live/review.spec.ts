import { test, expect } from 'sunpeak/test';

test('review tool renders review card with correct styles', async ({ live }) => {
  const app = await live.invoke('review-diff');

  // Title from simulation data
  const title = app.locator('h1').first();
  await expect(title).toBeVisible({ timeout: 15_000 });
  await expect(title).toHaveText('Refactor Authentication Module');

  const titleStyles = await title.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return { fontWeight: s.fontWeight, color: s.color };
  });
  expect(parseInt(titleStyles.fontWeight)).toBeGreaterThanOrEqual(600);

  // Title text color is resolved (not transparent)
  expect(titleStyles.color).not.toBe('rgba(0, 0, 0, 0)');
  const match = titleStyles.color.match(/\d+/g);
  expect(match).toBeTruthy();
  expect(match!.map(Number).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);

  // Change items: present with non-transparent backgrounds
  const changeItem = app.locator('li').first();
  await expect(changeItem).toBeVisible();

  const itemStyles = await changeItem.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return { backgroundColor: s.backgroundColor, borderRadius: s.borderRadius };
  });
  expect(itemStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

  // Action buttons: "Apply Changes" + "Cancel" (from simulation acceptLabel/rejectLabel)
  const buttons = app.locator('button');
  expect(await buttons.count()).toBeGreaterThanOrEqual(2);

  const buttonStyles = await buttons.first().evaluate((el) => {
    const s = window.getComputedStyle(el);
    return { cursor: s.cursor };
  });
  expect(buttonStyles.cursor).toBe('pointer');

  // Switch to dark mode and verify review card re-themes correctly
  await live.setColorScheme('dark', app);
  await expect(title).toBeVisible();
  const darkTitleColor = await title.evaluate((el) => window.getComputedStyle(el).color);
  expect(darkTitleColor).not.toBe('rgba(0, 0, 0, 0)');

  // Click Apply Changes — buttons replaced with acceptedMessage from simulation
  const applyButton = app.getByRole('button', { name: 'Apply Changes' });
  await applyButton.click();
  await expect(applyButton).not.toBeVisible({ timeout: 5_000 });
  await expect(app.locator('text=Applying changes...').first()).toBeVisible({ timeout: 5_000 });
});
