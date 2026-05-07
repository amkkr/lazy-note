import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright 設定
 *
 * - 3 viewport (mobile 390 / tablet 768 / desktop 1280) で smoke / VR を実行
 * - Visual Regression のデフォルト閾値は maxDiffPixelRatio: 0.001 に固定
 *   (Editorial Citrus RFC G5 / Roadmap #0b の AC に従う)
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
  // VR スナップショット比較のデフォルト閾値
  // 0.001 = 0.1% 以下のピクセル差分を許容 (フォントレンダリング差等の微小ノイズ用)
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.001,
    },
  },
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
      },
    },
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
