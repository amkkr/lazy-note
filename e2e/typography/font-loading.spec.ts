import { expect, test } from "@playwright/test";

/**
 * R-1 (Issue #387) で導入した Newsreader VF self-host が、実機ブラウザで
 * woff2 まで含めて正しくロードされ、本文の computedStyle にも反映されている
 * ことを Playwright で検証する (Issue #411)。
 *
 * jsdom ベースの単体テストでは @font-face の実ロードが行えず、
 * `document.fonts.check` が常に false を返すため、ここでは Playwright の
 * 実 Chromium で以下を検証する:
 * 1. `document.fonts.ready` が解決すること (FontFaceSet 全体のロード完了)
 * 2. `document.fonts.check("16px Newsreader")` が true になること
 *    (Newsreader フェイスがブラウザ FontFaceSet に登録されロード済み)
 * 3. PostDetail の本文要素 (body / 段落) の `getComputedStyle().fontFamily`
 *    に `Newsreader` が含まれること (CSS 変数経由のスタックが破壊されていない)
 */
test.describe("typography: Newsreader VF 実ロード", () => {
  test("ホームで document.fonts.ready が解決し Newsreader が check で true を返す", async ({
    page,
  }) => {
    await page.goto("/");

    // FontFaceSet 全体のロード完了を待つ。
    // CI 環境のネットワークによっては数百ms かかる可能性があるため waitForFunction で待機する。
    await page.waitForFunction(() => document.fonts.ready.then(() => true));

    const isLoaded = await page.evaluate(() =>
      document.fonts.check("16px Newsreader"),
    );

    expect(isLoaded).toBe(true);
  });

  test("PostDetail で body の fontFamily に Newsreader が含まれる", async ({
    page,
  }) => {
    await page.goto("/posts/20260307120000");

    await page.waitForFunction(() => document.fonts.ready.then(() => true));

    const bodyFontFamily = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).fontFamily;
    });

    expect(bodyFontFamily).toContain("Newsreader");
  });

  test("PostDetail 本文 paragraph の fontFamily にも Newsreader が含まれる", async ({
    page,
  }) => {
    await page.goto("/posts/20260307120000");

    await page.waitForFunction(() => document.fonts.ready.then(() => true));

    // 本文の <p> が描画されるまで待機。記事の prose は contentRef 配下に DOMPurify
    // 経由で挿入されるため、article 内部の <p> を探す。
    const paragraph = page.locator("article p").first();
    await paragraph.waitFor({ state: "attached" });

    const paragraphFontFamily = await paragraph.evaluate(
      (el) => window.getComputedStyle(el).fontFamily,
    );

    expect(paragraphFontFamily).toContain("Newsreader");
  });
});
