/** Playwright Locator subset used in live test assertions. */
export interface Locator {
  first(): Locator;
  nth(index: number): Locator;
  last(): Locator;
  count(): Promise<number>;
  click(options?: Record<string, any>): Promise<void>;
  isVisible(options?: Record<string, any>): Promise<boolean>;
  waitFor(options?: Record<string, any>): Promise<void>;
  evaluate<R>(fn: (el: HTMLElement) => R): Promise<R>;
  textContent(): Promise<string | null>;
  innerText(): Promise<string>;
  getAttribute(name: string): Promise<string | null>;
}

/** Playwright FrameLocator subset used in live test assertions. */
export interface FrameLocator {
  locator(selector: string): Locator;
  getByText(text: string | RegExp, options?: Record<string, any>): Locator;
  getByRole(role: string, options?: Record<string, any>): Locator;
  getByTestId(testId: string): Locator;
}

/** Common fixture interface shared by all host-specific and generic live fixtures. */
export interface LiveFixture {
  /**
   * The underlying Playwright Page. Exposed for advanced host-state changes
   * (e.g., page.setViewportSize(), page.emulateMedia()) that don't have
   * dedicated fixture helpers yet.
   */
  page: import('@playwright/test').Page;
  /** Start a new chat, send the prompt, and return the app FrameLocator. */
  invoke(prompt: string, options?: { timeout?: number }): Promise<FrameLocator>;
  /** Start a new conversation. */
  startNewChat(): Promise<void>;
  /** Send a message (with host-appropriate formatting). */
  sendMessage(text: string): Promise<void>;
  /** Send a message without any prefix. */
  sendRawMessage(text: string): Promise<void>;
  /** Wait for the MCP app iframe to render and return a FrameLocator. */
  waitForAppIframe(options?: { timeout?: number }): Promise<FrameLocator>;
  /** Get the app iframe FrameLocator. */
  getAppIframe(): FrameLocator;
  /**
   * Switch the browser's color scheme and wait for the app to apply the new theme.
   * Use this to test both light and dark mode within a single test after invoke(),
   * avoiding a second tool invocation and resource refresh.
   *
   * @param scheme - 'light' or 'dark'
   * @param appFrame - FrameLocator returned by invoke(). When provided, waits for
   *   data-theme on the app's <html> element to confirm the theme propagated.
   */
  setColorScheme(scheme: 'light' | 'dark', appFrame?: FrameLocator): Promise<void>;
}
