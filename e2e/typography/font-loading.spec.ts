import { expect, test } from "@playwright/test";
import { getLatestPostId } from "../_fixtures/latest-post";

/**
 * R-1 (Issue #387) で導入した Newsreader VF self-host が、実機ブラウザで
 * woff2 まで含めて正しくロードされ、本文の computedStyle にも反映されている
 * ことを Playwright で検証する (Issue #411)。
 *
 * jsdom ベースの単体テストでは @font-face の実ロードが行えず、
 * `document.fonts.check` が常に false を返すため、ここでは Playwright の
 * 実 Chromium で以下を検証する:
 *
 * 1. `document.fonts.ready` が解決すること (FontFaceSet 全体のロード完了)
 * 2. 個別 weight (400 / 700) の `document.fonts.load(...)` が成功し、
 *    対応する FontFace が `status === 'loaded'` であること (DA 重大 1 対応)。
 *    `document.fonts.check("16px Newsreader")` だけでは個別 weight や Latin-Ext
 *    のロードを保証しないため、明示的に load を呼んで weight ごとの実ロードを
 *    検証する。
 * 3. PostDetail の本文要素 (body / 段落) の `getComputedStyle().fontFamily`
 *    に `Newsreader` が含まれること (CSS 変数経由のスタックが破壊されていない
 *    補助的な確認)。
 *
 * viewport 非依存のため `desktop` プロジェクトでのみ実行 (DA 重大 3 対応)。
 */
test.describe("typography: Newsreader VF 実ロード", () => {
  // viewport 非依存のため desktop プロジェクトのみで検証する (DA 重大 3 対応)。
  // describe 配下の全 test に共通で適用するため beforeEach で skip 判定。
  test.beforeEach(async ({ }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "viewport 非依存のため desktop のみ実行 (CI 時間短縮)",
    );
  });

  test("ホームで document.fonts.ready が解決し Newsreader 400/700 weight がロード済み", async ({
    page,
  }) => {
    await page.goto("/");

    // FontFaceSet 全体のロード完了を待つ。
    // CI 環境のネットワークによっては数百ms かかる可能性があるため
    // waitForFunction で待機する。
    await page.waitForFunction(() => document.fonts.ready.then(() => true));

    // R-1 で読み込む weight (400: 本文 / 700: 強調) が個別に load 成功する
    // ことを検証する (DA 重大 1 対応)。`document.fonts.load` は同名 family の
    // 該当 weight を非同期にロードし、ロード済 FontFace の配列を resolve する。
    const loadResults = await page.evaluate(async () => {
      const [w400, w700] = await Promise.all([
        document.fonts.load("400 16px Newsreader"),
        document.fonts.load("700 16px Newsreader"),
      ]);
      return {
        w400Count: w400.length,
        w700Count: w700.length,
      };
    });

    // 各 weight に対応する FontFace が 1 つ以上ロードされていること。
    // (Newsreader VF は wght axis を持つ可変フォントだが、document.fonts.load
    //  は対応する FontFace 配列を返すため >= 1 で十分。)
    expect(loadResults.w400Count).toBeGreaterThanOrEqual(1);
    expect(loadResults.w700Count).toBeGreaterThanOrEqual(1);

    // FontFaceSet を iterate して "Newsreader" が status === "loaded" の
    // ファミリに含まれることを直接確認する (DA 重大 1 対応)。
    const loadedFamilies = await page.evaluate(() =>
      [...document.fonts]
        .filter((ff) => ff.status === "loaded")
        .map((ff) => ff.family),
    );

    expect(loadedFamilies).toContain("Newsreader");
  });

  test("PostDetail で body の fontFamily に Newsreader が含まれる", async ({
    page,
  }) => {
    const postId = getLatestPostId();
    await page.goto(`/posts/${postId}`);

    await page.waitForFunction(() => document.fonts.ready.then(() => true));

    const bodyFontFamily = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).fontFamily;
    });

    // CSS 変数経由のフォントスタック (`--fonts-body` 等) が破壊されておらず、
    // computed value 文字列に `Newsreader` が含まれている補助的検証。
    // 実描画フォントの確認は document.fonts.load 側で別途担保しているため、
    // ここでは「CSS のスタック宣言が壊れていない」ことを確認するに留める。
    expect(bodyFontFamily).toContain("Newsreader");
  });

  test("PostDetail 本文 paragraph の fontFamily にも Newsreader が含まれる", async ({
    page,
  }) => {
    const postId = getLatestPostId();
    await page.goto(`/posts/${postId}`);

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
