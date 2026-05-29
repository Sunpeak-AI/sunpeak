import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
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

const modelAlbumResult = {
  structuredContent: {
    albums: [
      {
        id: 'model-tasting-menu',
        title: 'Model Tasting Menu',
        cover: 'https://cdn.sunpeak.ai/demo/pizza1.jpeg',
        photos: [
          {
            id: 'model-tasting-menu-1',
            title: 'Corner slice',
            url: 'https://cdn.sunpeak.ai/demo/pizza2.jpeg',
          },
          {
            id: 'model-tasting-menu-2',
            title: 'Table spread',
            url: 'https://cdn.sunpeak.ai/demo/pizza3.jpeg',
          },
        ],
      },
    ],
  },
};

const modelCarouselResult = {
  structuredContent: {
    places: [
      {
        id: 'model-austin-landmark',
        name: 'Austin Landmark',
        rating: 4.7,
        category: 'landmark',
        location: 'Austin',
        image: 'https://cdn.sunpeak.ai/demo/austin1.jpeg',
        description: 'A popular landmark in Austin',
      },
    ],
  },
};

async function submitModelMessage(page: Page, message: string) {
  const composer = page.locator('input[name="userInput"]').last();
  await expect(composer).toBeEnabled();
  await composer.fill(message);
  await expect(composer).toHaveValue(message);
  await composer.press('Enter');
}

async function routeSavedModelKey(page: Page) {
  await page.route('**/__sunpeak/model-key?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        hasKey: true,
        storage: 'test credential store',
      }),
    });
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page
        .locator('.sunpeak-inspector-root > main')
        .evaluate((el) => el.scrollWidth - el.clientWidth)
    )
    .toBeLessThanOrEqual(1);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(1);
}

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
    test('live MCP endpoint calls real handler instead of fixture data', async ({ page }) => {
      const response = await page.request.post('/__sunpeak/call-tool-live', {
        data: {
          name: 'show-albums',
          arguments: { category: 'model', limit: 1 },
        },
      });
      await expect(response).toBeOK();

      const result = await response.json();
      const serialized = JSON.stringify(result);
      expect(serialized).toContain('Model Photos');
      expect(serialized).not.toContain('Summer Slice');
    });

    test('live MCP endpoint calls carousel handler instead of fixture data', async ({ page }) => {
      const response = await page.request.post('/__sunpeak/call-tool-live', {
        data: {
          name: 'show-carousel',
          arguments: { city: 'Austin', categories: ['landmark'], limit: 1 },
        },
      });
      await expect(response).toBeOK();

      const result = await response.json();
      const places = result?.structuredContent?.places ?? [];
      expect(places).toHaveLength(1);
      expect(places[0]?.name).toBe('Austin Landmark');
      expect(JSON.stringify(result)).not.toContain('Lady Bird Lake');
    });

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

      const response = await page.request.get('/dist/albums/albums.html');
      await expect(response).toBeOK();
      expect(response.headers()['content-security-policy']).toContain('sandbox');
      expect(response.headers()['content-security-policy']).not.toContain('allow-same-origin');

      const prodResourcesHelp = page.getByRole('link', {
        name: 'Load resources from dist/ builds instead of HMR',
      });
      await prodResourcesHelp.hover();
      const helpBox = await prodResourcesHelp.boundingBox();
      const tooltipBox = await prodResourcesHelp.locator('span[aria-hidden="true"]').boundingBox();
      expect(helpBox).not.toBeNull();
      expect(tooltipBox).not.toBeNull();
      const tooltipGapFromCursor = Math.round(tooltipBox!.x - (helpBox!.x + helpBox!.width / 2));
      expect(tooltipGapFromCursor).toBeLessThanOrEqual(12);
      expect(tooltipGapFromCursor).toBeGreaterThanOrEqual(4);

      const appContextHelp = page.getByRole('link', {
        name: 'App-provided context shared with the model',
      });
      await appContextHelp.hover();
      const rightHelpBox = await appContextHelp.boundingBox();
      const leftTooltipBox = await appContextHelp.locator('span[aria-hidden="true"]').boundingBox();
      expect(rightHelpBox).not.toBeNull();
      expect(leftTooltipBox).not.toBeNull();
      expect(leftTooltipBox!.x + leftTooltipBox!.width).toBeLessThanOrEqual(rightHelpBox!.x);
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

      const viewport = page.viewportSize();
      if (!viewport) throw new Error('Expected Playwright viewport');
      await expect
        .poll(async () => {
          const box = await page.locator('iframe[title="Resource Preview"]').first().boundingBox();
          return Math.round(box?.width ?? 0);
        })
        .toBeGreaterThan(Math.round(viewport.width * 0.55));
      await expectNoHorizontalOverflow(page);
    });
  });

  test.describe(`Theme Switching [${host}]`, () => {
    test('switching theme to light updates the inspector root', async ({ page }) => {
      await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host }));

      // Click "Light" button in Theme toggle
      await page.locator('button[aria-pressed]:has-text("Light")').click();

      // Theme (data-theme + color-scheme) is applied to the inspector root
      // ref rather than `document.documentElement` — keeps the Inspector
      // self-contained when embedded inside another React app.
      const colorScheme = await page
        .locator('.sunpeak-inspector-root')
        .first()
        .evaluate((el) => (el as HTMLElement).style.colorScheme);
      expect(colorScheme).toContain('light');
    });
  });

  test.describe(`Model Chat [${host}]`, () => {
    test('submits a prompt, renders model text, tool call JSON, and the MCP App', async ({
      page,
    }) => {
      const prompt = 'Show me an album from the model';
      let requestBody: Record<string, unknown> | undefined;
      let responseIndex = 0;
      let releaseFirstResponse: (() => void) | undefined;
      const firstResponseGate = new Promise<void>((resolve) => {
        releaseFirstResponse = resolve;
      });

      await routeSavedModelKey(page);

      await page.route('**/__sunpeak/model-chat', async (route) => {
        responseIndex += 1;
        requestBody = JSON.parse(route.request().postData() ?? '{}');
        const title = responseIndex === 1 ? 'Model Tasting Menu' : 'Second Model Menu';
        if (responseIndex === 1) {
          await firstResponseGate;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            text:
              responseIndex === 1
                ? 'I found one album from the model.'
                : 'I found a second album from the model.',
            toolCalls: [
              {
                name: 'show-albums',
                arguments: {
                  category: 'model',
                  limit: 1,
                },
                result: {
                  structuredContent: {
                    albums: [
                      {
                        ...modelAlbumResult.structuredContent.albums[0],
                        id: `model-tasting-menu-${responseIndex}`,
                        title,
                      },
                    ],
                  },
                },
              },
            ],
          }),
        });
      });

      await page.goto(createInspectorUrl({ simulation: 'show-albums', theme: 'dark', host }));

      await expect(page.getByText('Model Chat')).toBeVisible();
      await expect(page.getByTestId('tool-result-textarea')).toHaveValue(/Summer Slice/);
      await submitModelMessage(page, prompt);
      await expect(page.getByTestId('tool-result-textarea')).toHaveValue('');
      await expect(page.getByTestId('tool-result-textarea')).not.toHaveValue(/Summer Slice/);
      releaseFirstResponse?.();

      await expect(page.locator('[data-turn="user"]').filter({ hasText: prompt })).toBeVisible();
      await expect(
        page.locator('[data-turn="assistant"]').filter({
          hasText: 'I found one album from the model.',
        })
      ).toBeVisible();
      await expect(page.getByText('Tool call: show-albums')).toBeVisible();
      await expect(
        page.locator('[data-turn="assistant"] pre').filter({ hasText: '"category": "model"' })
      ).toBeVisible();

      await expect(page.getByTestId('tool-input-textarea')).toHaveValue(/"category": "model"/);
      await expect(page.getByTestId('tool-result-textarea')).toHaveValue(/Model Tasting Menu/);
      await expect(page.getByTestId('tool-result-textarea')).not.toHaveValue(/Summer Slice/);

      const iframe = page.frameLocator('iframe').frameLocator('iframe');
      await expect(iframe.locator('button:has-text("Model Tasting Menu")')).toBeVisible({
        timeout: 10000,
      });

      await page.locator('button[aria-pressed]:has-text("Full")').click();
      await expect(iframe.locator('button:has-text("Model Tasting Menu")')).toBeVisible({
        timeout: 5000,
      });
      await expectNoHorizontalOverflow(page);
      await page.getByRole('button', { name: host === 'chatgpt' ? /^Close$/ : /^Back$/ }).click();

      expect(requestBody).toMatchObject({
        provider: 'openai',
        modelId: 'gpt-5.5',
        messages: [{ role: 'user', content: prompt }],
      });

      await submitModelMessage(page, 'Show me another album from the model');

      const firstAssistant = page
        .locator('[data-turn="assistant"]')
        .filter({ hasText: 'I found one album from the model.' });
      const secondAssistant = page
        .locator('[data-turn="assistant"]')
        .filter({ hasText: 'I found a second album from the model.' });
      await expect(firstAssistant.locator('iframe')).toHaveCount(0);
      await expect(secondAssistant.locator('iframe')).toHaveCount(1);
      await expect(iframe.locator('button:has-text("Second Model Menu")')).toBeVisible();
    });

    test('renders carousel from model tool result without restoring the fixture', async ({
      page,
    }) => {
      const prompt = 'sunpeak-app show carousel make it up';

      await routeSavedModelKey(page);

      await page.route('**/__sunpeak/model-chat', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            text: 'I called the carousel tool and rendered the app.',
            toolCalls: [
              {
                name: 'show-carousel',
                arguments: {
                  city: 'Austin',
                  categories: ['landmark'],
                  limit: 1,
                },
                result: modelCarouselResult,
              },
            ],
          }),
        });
      });

      await page.goto(createInspectorUrl({ simulation: 'show-carousel', theme: 'dark', host }));

      await expect(page.getByTestId('tool-result-textarea')).toHaveValue(/Lady Bird Lake/);
      await submitModelMessage(page, prompt);

      await expect(page.getByTestId('tool-input-textarea')).toHaveValue(/"city": "Austin"/);
      await expect(page.getByTestId('tool-result-textarea')).toHaveValue(/Austin Landmark/);
      await expect(page.getByTestId('tool-result-textarea')).not.toHaveValue(/Lady Bird Lake/);
      await expect(page.getByTestId('tool-result-textarea')).not.toHaveValue(
        /South Congress Avenue/
      );

      await expect
        .poll(async () =>
          page.evaluate(() => {
            const text = document.getElementById('__tool-result')?.textContent;
            return text ? JSON.parse(text) : null;
          })
        )
        .toMatchObject({
          source: 'live-mcp',
          structuredContent: {
            places: [{ name: 'Austin Landmark' }],
          },
        });

      const iframe = page.frameLocator('iframe').frameLocator('iframe');
      await expect(iframe.getByRole('heading', { name: 'Austin Landmark' })).toBeVisible({
        timeout: 10000,
      });
      await expect(iframe.getByRole('heading', { name: 'Lady Bird Lake' })).not.toBeVisible();
    });

    test('resetting model chat clears the transcript and starts a new backend conversation', async ({
      page,
    }) => {
      const requestBodies: Array<Record<string, unknown>> = [];

      await routeSavedModelKey(page);

      await page.route('**/__sunpeak/model-chat', async (route) => {
        const body = JSON.parse(route.request().postData() ?? '{}');
        requestBodies.push(body);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            text: `Reply ${requestBodies.length}`,
            toolCalls: [],
          }),
        });
      });

      await page.goto(createInspectorUrl({ tool: 'show-albums', theme: 'dark', host }));

      const resetButton = page.getByRole('button', { name: 'Reset model conversation' });
      await expect(resetButton).toBeDisabled();

      await submitModelMessage(page, 'First model prompt');
      await expect(
        page.locator('[data-turn="user"]').filter({ hasText: 'First model prompt' })
      ).toBeVisible();
      await expect(
        page.locator('[data-turn="assistant"]').filter({ hasText: 'Reply 1' })
      ).toBeVisible();
      await expect(resetButton).toBeEnabled();

      await resetButton.click();
      await expect(
        page.locator('[data-turn="user"]').filter({ hasText: 'First model prompt' })
      ).toHaveCount(0);
      await expect(
        page.locator('[data-turn="assistant"]').filter({ hasText: 'Reply 1' })
      ).toHaveCount(0);
      await expect(resetButton).toBeDisabled();

      await submitModelMessage(page, 'Second model prompt');
      await expect(
        page.locator('[data-turn="assistant"]').filter({ hasText: 'Reply 2' })
      ).toBeVisible();

      expect(requestBodies).toHaveLength(2);
      expect(requestBodies[0].conversationId).toEqual(expect.stringMatching(/^model-chat-/));
      expect(requestBodies[1].conversationId).toEqual(expect.stringMatching(/^model-chat-/));
      expect(requestBodies[1].conversationId).not.toBe(requestBodies[0].conversationId);
      expect(requestBodies[1].messages).toEqual([{ role: 'user', content: 'Second model prompt' }]);
    });

    test('preserves model tool data when switching from the default tool to carousel', async ({
      page,
    }) => {
      await routeSavedModelKey(page);

      await page.route('**/__sunpeak/model-chat', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            text: 'I called the carousel tool and rendered the app.',
            toolCalls: [
              {
                name: 'show-carousel',
                arguments: {
                  city: 'Austin',
                  categories: ['landmark'],
                  limit: 1,
                },
                result: modelCarouselResult,
              },
            ],
          }),
        });
      });

      await page.goto(createInspectorUrl({ theme: 'dark', host }));
      await submitModelMessage(page, 'sunpeak-app show carousel make it up');

      await expect(page.getByTestId('simulation-selector').locator('select')).toHaveValue(
        '__live__'
      );

      await expect(page.getByTestId('tool-input-textarea')).toHaveValue(/"city": "Austin"/);
      await expect(page.getByTestId('tool-result-textarea')).toHaveValue(/Austin Landmark/);
      await expect(page.getByTestId('tool-result-textarea')).not.toHaveValue(/Lady Bird Lake/);
      await expect(page.getByTestId('tool-result-textarea')).not.toHaveValue(
        /South Congress Avenue/
      );

      const iframe = page.frameLocator('iframe').frameLocator('iframe');
      await expect(iframe.getByRole('heading', { name: 'Austin Landmark' })).toBeVisible({
        timeout: 10000,
      });
      await expect(iframe.getByRole('heading', { name: 'Lady Bird Lake' })).not.toBeVisible();

      const toolResultTextarea = page.getByTestId('tool-result-textarea');
      await toolResultTextarea.fill(
        (await toolResultTextarea.inputValue()).replace('Austin Landmark', 'Austin Observatory')
      );
      await toolResultTextarea.blur();
      await expect(iframe.getByRole('heading', { name: 'Austin Observatory' })).toBeVisible();
      await expect(iframe.getByRole('heading', { name: 'Austin Landmark' })).not.toBeVisible();
    });

    test('supports Anthropic provider selection and text-only model responses', async ({
      page,
    }) => {
      const prompt = 'Answer without opening the app';
      let requestBody: Record<string, unknown> | undefined;

      await routeSavedModelKey(page);

      await page.route('**/__sunpeak/model-chat', async (route) => {
        requestBody = JSON.parse(route.request().postData() ?? '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            text: 'Plain model answer, no MCP tool call needed.',
            toolCalls: [],
          }),
        });
      });

      await page.goto(createInspectorUrl({ tool: 'show-albums', theme: 'dark', host }));

      await page
        .locator('select')
        .filter({ has: page.locator('option[value="anthropic"]') })
        .selectOption('anthropic');
      const modelInput = page.locator('input[placeholder="claude-sonnet-4-20250514"]');
      await expect(modelInput).toHaveValue('claude-sonnet-4-20250514');
      await modelInput.fill('claude-test-model');
      await modelInput.press('Enter');

      await submitModelMessage(page, prompt);

      await expect(
        page.locator('[data-turn="assistant"]').filter({
          hasText: 'Plain model answer, no MCP tool call needed.',
        })
      ).toBeVisible();
      await expect(page.getByText('Tool call:')).not.toBeVisible();
      await expect(page.getByTestId('tool-result-textarea')).toHaveValue('');

      expect(requestBody).toMatchObject({
        provider: 'anthropic',
        modelId: 'claude-test-model',
        messages: [{ role: 'user', content: prompt }],
      });
    });

    test('shows model errors and re-enables the composer for another message', async ({ page }) => {
      await routeSavedModelKey(page);

      await page.route('**/__sunpeak/model-chat', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'No API key stored for openai.',
          }),
        });
      });

      await page.goto(createInspectorUrl({ tool: 'show-albums', theme: 'dark', host }));

      await submitModelMessage(page, 'Try a request without a saved key');

      await expect(
        page.locator('[data-turn="assistant"]').filter({ hasText: 'Error:' })
      ).toContainText('No API key stored for openai.');
      const composer = page.locator('input[name="userInput"]').last();
      await expect(composer).toBeEnabled();
      await composer.fill('I can type again');
      await expect(composer).toHaveValue('I can type again');
    });
  });
}

test.describe('Model Chat API Keys', () => {
  test('saves and clears a local API key without echoing the secret into the UI', async ({
    page,
  }) => {
    const secret = 'sk-test-secret-that-must-not-render';
    const keyRequests: Array<Record<string, unknown>> = [];

    await page.route('**/__sunpeak/model-key**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            hasKey: false,
            storage: 'test key store',
          }),
        });
        return;
      }
      const body = JSON.parse(route.request().postData() ?? '{}');
      keyRequests.push(body);
      const hasKey = Boolean(body.apiKey);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          provider: body.provider,
          hasKey,
          storage: hasKey ? 'test key store' : null,
        }),
      });
    });

    await page.goto(createInspectorUrl({ tool: 'show-albums', theme: 'dark', host: 'chatgpt' }));

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toHaveAttribute('placeholder', 'Paste openai key');
    await expect(page.getByText('Key saved test key store')).not.toBeVisible();
    await passwordInput.fill(secret);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Saved test key store')).toBeVisible();
    await expect(passwordInput).toHaveValue('');
    await expect(page.locator('body')).not.toContainText(secret);

    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByText('Cleared')).toBeVisible();
    await expect(page.locator('input[name="userInput"]').last()).toBeDisabled();
    await expect(page.locator('input[name="userInput"]').last()).toHaveAttribute(
      'placeholder',
      'Add an API key to chat with gpt-5.5'
    );

    expect(keyRequests).toEqual([
      { provider: 'openai', apiKey: secret },
      { provider: 'openai', apiKey: '' },
    ]);
  });
});

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

    const innerFrameElement = outerIframe.locator('iframe').first();
    const src = await innerFrameElement.getAttribute('src');
    expect(src).toContain('/__sunpeak/read-resource');
    const response = await page.request.get(src!);
    await expect(response).toBeOK();
    expect(response.headers()['content-security-policy']).toContain('sandbox');
    expect(response.headers()['content-security-policy']).not.toContain('allow-same-origin');
  });
});
