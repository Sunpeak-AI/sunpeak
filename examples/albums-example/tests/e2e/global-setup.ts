/**
 * Playwright global setup.
 *
 * The webServer (pnpm dev) handles building resources via its build watcher.
 * No separate build step needed here — the dev server's initial build creates
 * dist/ files before serving the first request.
 */
export default function globalSetup() {
  // Nothing to do — the webServer handles everything.
}
