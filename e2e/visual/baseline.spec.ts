import { expect, test } from "@playwright/test";

/**
 * Visual Regression baseline
 *
 * Editorial Citrus RFC G5 / Roadmap #0b の AC に対応:
 * - 代表 3 ページ (`/`, 記事 1, 記事 2) × 3 viewport で 9 枚の baseline を撮影
 * - 閾値 maxDiffPixelRatio: 0.001 は playwright.config.ts で固定済み
 * - PR で diff があれば失敗、`pnpm test:vr:update` で baseline 更新可能
 *
 * 決定論性のため:
 * - prefers-reduced-motion を強制し、Headless UI の Transition を抑止
 * - document.fonts.ready でフォント未ロード状態の CLS を回避
 * - networkidle でデータソース fetch 完了を待つ
 *
 * 代表ページ:
 * - `/`            : ホーム (記事一覧)
 * - 記事 (本文長め): /posts/20260307120000
 * - 記事 (本文短め): /posts/20260221104801
 *   ※ /about ページは存在しないため、記事 2 本目を 3 つ目の代表として採用
 */

const REPRESENTATIVE_PAGES: { name: string; path: string }[] = [
  { name: "home", path: "/" },
  { name: "post-20260307120000", path: "/posts/20260307120000" },
  { name: "post-20260221104801", path: "/posts/20260221104801" },
];

test.describe("VR baseline: 代表 3 ページ", () => {
  // アニメーション抑止 (Headless UI Transition の不安定要素を排除)
  test.use({ reducedMotion: "reduce" });

  for (const { name, path } of REPRESENTATIVE_PAGES) {
    test(`${name} のスクリーンショットが baseline と一致する`, async ({
      page,
    }) => {
      await page.goto(path);

      // データ fetch (datasources/*.md) の完了を待つ
      await page.waitForLoadState("networkidle");

      // フォントの読み込み完了を待つ (CLS 回避)
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      // フルページのスナップショットを撮影
      // viewport 名 (mobile/tablet/desktop) は projects 名から自動付与される
      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: true,
        animations: "disabled",
      });
    });
  }
});
