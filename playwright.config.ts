import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright 設定
 *
 * Editorial Citrus デザインリニューアル (#0a 〜 #4a) に向けた E2E 基盤。
 * - a11y (axe-core) は desktop viewport のみで十分なため `e2e/a11y/` を desktop project で実行する
 * - 将来 smoke / VR を追加する際は projects に viewport を増やす
 * - dev server (vite) を webServer で自動起動
 * - CI ではリトライを有効化、ローカルでは無効
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html"], ["github"]] : "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
