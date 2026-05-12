import { expect, test } from "@playwright/test";

/**
 * Visual Regression (VR) Phase 1
 *
 * Issue #410: Phase 2 リニューアル後の VR テスト基盤 (新規構築) の Phase 1 スコープ。
 *
 * 対象:
 * - Home (`/`) と PostDetail (`/posts/20260307120000`) の 2 ページ
 * - viewport: desktop 1280x720
 * - theme: light のみ
 * - 合計 2 PNG
 *
 * 注意:
 * - macOS でローカル生成した PNG は CI Linux と必発差分のためコミット禁止
 *   (`.gitignore` で `e2e/visual/**\/*-darwin.png` を除外)
 * - baseline 生成は CI (`workflow_dispatch` で `--update-snapshots` 実行) で行う
 *
 * 安定化のための前処理:
 * - `localStorage.clear()`: `useTheme.ts` は localStorage 値を最優先するため
 *   テーマを `emulateMedia` で固定するには事前クリアが必須
 * - `emulateMedia({ colorScheme: "light", reducedMotion: "reduce" })`:
 *   light テーマ固定 + View Transitions 抑制 (`index.css` に対応 CSS あり)
 * - `document.fonts.ready` await: WebFont 読込完了を待ち、フォント差し替えで
 *   発生する text glyph 差分を最小化
 * - `networkidle` 後にさらに font ready を待つことで描画完了を担保
 *
 * Phase 2 / Phase 3 は別 PR で対応:
 * - Phase 2: dark テーマ追加 (合計 4 PNG)
 * - Phase 3: mobile viewport 追加 (合計 8 PNG)
 */

type VisualTarget = {
  readonly name: string;
  readonly path: string;
};

const TARGETS: readonly VisualTarget[] = [
  { name: "home", path: "/" },
  { name: "post-detail", path: "/posts/20260307120000" },
];

test.describe("visual: main pages (desktop x light)", () => {
  test.beforeEach(async ({ page }) => {
    // useTheme が localStorage を最優先するため、emulateMedia を効かせる
    // 前提として goto より前にクリアしておく。
    // ただし localStorage アクセスにはオリジン上のページが必要なため、
    // about:blank では失敗する。代替として goto 直後に再度クリアし、
    // theme = system 状態に戻す。
    await page.emulateMedia({
      colorScheme: "light",
      reducedMotion: "reduce",
    });
  });

  for (const target of TARGETS) {
    test(`${target.name} の light テーマ snapshot を取得できる`, async ({
      page,
    }) => {
      // 最初に対象ページを開いてから localStorage をクリアする。
      // (Playwright の page は新規 BrowserContext 起動直後で空のはずだが、
      //  reuseExistingServer 等の影響を防ぐため明示的にクリア)
      await page.goto(target.path);
      await page.evaluate(() => {
        try {
          localStorage.clear();
        } catch {
          /* localStorage 不可環境は無視 */
        }
      });

      // localStorage クリア後にテーマを system 追従に戻すため再 reload する。
      // emulateMedia の colorScheme: "light" が有効になるはず。
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);

      await expect(page).toHaveScreenshot(`${target.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });
  }
});
