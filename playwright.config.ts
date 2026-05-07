import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright 設定
 *
 * - 3 viewport (mobile 390 / tablet 768 / desktop 1280) で smoke を実行
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
    // CI では panda の watch を伴わず、ビルド時に `panda` で `styles.css` を
    // 1 回生成してから `vite` を起動する。`pnpm dev` (panda watch & vite) は
    // バックグラウンド panda が落ちても vite が起動してしまい、その場合
    // `styled-system/styles.css` の生成漏れで描画失敗 → テスト hang/timeout
    // を招くため CI では使用しない。
    command: process.env.CI
      ? "pnpm exec panda && pnpm exec vite --port 5173 --strictPort"
      : "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
