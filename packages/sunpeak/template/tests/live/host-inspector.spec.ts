import { test } from 'sunpeak/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = join(import.meta.dirname, '../../.context');

test('extract host inspector data for both themes', async ({ live }) => {
  // Invoke the host inspector tool
  const app = await live.invoke('inspect host');

  // Wait for inspector data element to render
  await app.locator('#__inspector-data').waitFor({ state: 'attached', timeout: 30_000 });

  // --- Dark mode extraction ---
  await live.setColorScheme('dark', app);
  await app.locator('#__inspector-data').waitFor({ state: 'attached', timeout: 10_000 });
  const darkJson = await app.locator('#__inspector-data').textContent();
  if (!darkJson) throw new Error('Inspector data element was empty (dark mode)');
  const darkData = JSON.parse(darkJson);

  // Extract dark page chrome BEFORE switching to light
  const page = live.page;
  const darkPageChrome = await extractPageChrome(page);

  // --- Light mode extraction ---
  await live.setColorScheme('light', app);
  await app.locator('#__inspector-data').waitFor({ state: 'attached', timeout: 10_000 });
  const lightJson = await app.locator('#__inspector-data').textContent();
  if (!lightJson) throw new Error('Inspector data element was empty (light mode)');
  const lightData = JSON.parse(lightJson);

  const lightPageChrome = await extractPageChrome(page);

  // Write all captured data
  const output = {
    capturedAt: new Date().toISOString(),
    dark: { inspector: darkData, pageChrome: darkPageChrome },
    light: { inspector: lightData, pageChrome: lightPageChrome },
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, 'chatgpt-host-data.json'), JSON.stringify(output, null, 2));
  console.log('Wrote chatgpt-host-data.json');
});

async function extractPageChrome(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const cs = (sel: string, prop: string) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).getPropertyValue(prop) : null;
    };

    return {
      sidebarBg: cs('nav', 'backgroundColor'),
      conversationBg: cs('main', 'backgroundColor'),
      userBubbleBg:
        cs('[data-message-author-role="user"] > div > div', 'backgroundColor') ||
        cs('[data-message-author-role="user"]', 'backgroundColor'),
      inputBg: cs('#prompt-textarea', 'backgroundColor'),
      bodyBg: cs('body', 'backgroundColor'),
    };
  });
}
