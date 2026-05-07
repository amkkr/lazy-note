import { defineConfig } from "@playwright/test";

/**
 * Playwright 設定
 * 現状の用途: Phase 0 タイポグラフィ採点用の組版サンプル撮影 (e2e/typography-phase0)
 * 参照: docs/rfc/editorial-citrus/03-typography.md
 */
export default defineConfig({
  testDir: "./e2e",
  // 撮影は決定論的に直列実行する (フォントロード待ちと一貫した出力サイズのため)
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  // Playwright の中間生成物 (test-results/) は node_modules 内に隔離し、
  // .gitignore を変更しなくてもリポジトリに混入しないようにする
  outputDir: "./node_modules/.cache/playwright-output",
  use: {
    // 撮影サンプルは静的 HTML を file:// で開く形で完結させる
    baseURL: undefined,
    headless: true,
    deviceScaleFactor: 2,
  },
});
